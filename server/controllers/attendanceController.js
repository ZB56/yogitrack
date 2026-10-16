/**
 * server/controllers/attendanceController.js
 * ------------------------------------------
 * The business rules for UC6, "Record class attendance".
 *
 * This is the use case with the most moving parts, and the one the whole data
 * model exists to support: it reads a class, a list of customers and their
 * purchases, decides what each check-in costs, writes a sheet, updates every
 * attendee's balance and sends each of them a message.
 *
 * Two rules from the specification shape the design:
 *
 *   Step 8 — a customer without the balance for the class must be flagged,
 *   and the instructor must be ABLE TO GO AHEAD ANYWAY, leaving a negative
 *   balance "to be resolved later". So an insufficient balance is a
 *   confirmation, not a rejection. Exactly the shape of UC1's duplicate-name
 *   prompt, and it uses the same 409 + requiresConfirmation convention.
 *
 *   Step 10 — every attendee is sent their new balance. The balance in that
 *   message has to be the one actually written, which is why the balance
 *   update and the message are built from the same computed figure rather
 *   than each working it out separately.
 */

import Attendance from '../models/Attendance.js';
import Class from '../models/Class.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import { generateId } from '../services/idGenerator.js';
import { sendMessage, checkInMessage } from '../services/messaging.js';

/**
 * Decide what one customer's check-in costs.
 *
 * The order of the checks is the entitlement rule:
 *
 *   1. An active unlimited package covers the class and deducts nothing
 *      (design decision 4: unlimited is entitlement by date, not a counter).
 *   2. Otherwise one class comes off the balance.
 *   3. A balance that cannot cover it is flagged, and the caller decides
 *      whether to go ahead (step 8).
 *
 * @param {object} customer - the Customer document
 * @param {Array} sales - that customer's sales
 * @param {object} classDoc - the class being held
 * @param {Date} heldAt - when it was held
 * @returns {{customerId: string, fullName: string, usedUnlimited: boolean,
 *            balanceBefore: number, balanceAfter: number,
 *            insufficient: boolean, warning: string|null}}
 */
function assessCheckIn(customer, sales, classDoc, heldAt) {
  // "Active" is judged at the time of the CLASS, not the time of typing: a
  // sheet filled in on Monday for last Friday's class must be judged by
  // whether the package covered the customer on Friday.
  const activeSales = sales.filter(
    (sale) => sale.validFrom <= heldAt && sale.validTo >= heldAt
  );

  const unlimitedCover = activeSales.find((sale) => sale.unlimited);

  /**
   * A soft check on class type, deliberately a warning rather than a block.
   *
   * The requirements say a Special package admits its holder only to Special
   * classes, but the data model the use cases specify keeps ONE balance per
   * customer rather than a balance per package type, so the system cannot
   * tell which purchase a counted check-in is drawing on. Blocking on this
   * would be enforcing a rule the data cannot actually support. Flagging it
   * gives the instructor the information and leaves the judgement with them.
   * Recorded as a known limitation in the project report.
   */
  const hasMatchingType = activeSales.some(
    (sale) => sale.classType === classDoc.classType
  );

  const warning =
    activeSales.length > 0 && !hasMatchingType
      ? `No active ${classDoc.classType} package on file.`
      : null;

  if (unlimitedCover) {
    return {
      customerId: customer.customerId,
      fullName: customer.fullName,
      usedUnlimited: true,
      balanceBefore: customer.classBalance,
      balanceAfter: customer.classBalance, // nothing is deducted
      insufficient: false,
      warning,
      coveredBy: unlimitedCover.saleId,
    };
  }

  const balanceBefore = customer.classBalance;
  const balanceAfter = balanceBefore - 1;

  return {
    customerId: customer.customerId,
    fullName: customer.fullName,
    usedUnlimited: false,
    balanceBefore,
    balanceAfter,
    // Running out is the condition in step 8: there is nothing left to spend.
    insufficient: balanceBefore < 1,
    warning,
  };
}

/**
 * Load the class, check the signed-in user may take its register, and gather
 * the customers and their sales. Shared by the preview and the save, so the
 * two can never disagree about who is covered.
 *
 * @returns {Promise<{error: object|null, classDoc: object, assessments: Array}>}
 */
async function assessSheet({ classId, heldAt, customerIds, user }) {
  const classDoc = await Class.findOne({ classId: String(classId || '').toUpperCase() });

  if (!classDoc) {
    return {
      error: {
        status: 400,
        body: {
          error: 'Unknown class',
          message: 'Please choose a class from the list.',
          fields: { classId: 'No class with that id.' },
        },
      },
    };
  }

  // UC6's actor is the Instructor, and an instructor takes the register for
  // their own classes. A manager may also record one, which is how the
  // studio covers for an instructor who could not file their sheet.
  if (user.role === 'instructor' && classDoc.instructorId !== user.instructorId) {
    return {
      error: {
        status: 403,
        body: {
          error: 'Not allowed',
          message: 'You can only record attendance for the classes you lead.',
        },
      },
    };
  }

  const uniqueIds = [...new Set((customerIds || []).map((id) => String(id).toUpperCase()))];

  if (uniqueIds.length === 0) {
    return {
      error: {
        status: 400,
        body: {
          error: 'No attendees',
          message: 'Add at least one customer to the attendance sheet.',
          fields: { customerIds: 'Add at least one customer.' },
        },
      },
    };
  }

  const customers = await Customer.find({ customerId: { $in: uniqueIds } });

  if (customers.length !== uniqueIds.length) {
    const found = new Set(customers.map((customer) => customer.customerId));
    const missing = uniqueIds.filter((id) => !found.has(id));

    return {
      error: {
        status: 400,
        body: {
          error: 'Unknown customer',
          message: `No customer with id ${missing.join(', ')}.`,
          fields: { customerIds: `Unknown customer: ${missing.join(', ')}.` },
        },
      },
    };
  }

  // Every attendee's sales in ONE query rather than one query per person.
  const sales = await Sale.find({ customerId: { $in: uniqueIds } });
  const salesByCustomer = new Map(uniqueIds.map((id) => [id, []]));
  for (const sale of sales) {
    salesByCustomer.get(sale.customerId)?.push(sale);
  }

  const assessments = customers.map((customer) =>
    assessCheckIn(customer, salesByCustomer.get(customer.customerId) || [], classDoc, heldAt)
  );

  return { error: null, classDoc, assessments };
}

/**
 * Does the date and time entered match when this class is scheduled?
 *
 * UC6 step 5: "YogiTrack also displays a warning if the date and time do not
 * match with the class schedule. For example, if the class schedule was Mon
 * 9am but the attendance sheet has Tue 9am, then a warning will be indicated."
 *
 * A warning, not an error: a class genuinely can be moved or made up on
 * another day, and the sheet should record when it was actually held.
 *
 * @param {object} classDoc
 * @param {Date} heldAt
 * @returns {string|null} the warning, or null when it matches
 */
function scheduleMismatch(classDoc, heldAt) {
  const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const actualDay = DAY_NAMES[heldAt.getDay()];
  const actualTime = `${String(heldAt.getHours()).padStart(2, '0')}:${String(
    heldAt.getMinutes()
  ).padStart(2, '0')}`;

  if (actualDay === classDoc.day && actualTime === classDoc.time) return null;

  return (
    `${classDoc.classId} is scheduled for ${classDoc.day} at ${classDoc.time}, ` +
    `but this sheet says ${actualDay} at ${actualTime}.`
  );
}

/**
 * Preview a sheet without saving it: what each check-in would cost, who is
 * short, and whether the date matches the schedule.
 *
 * UC6 steps 5 and 8 happen while the instructor is still filling the sheet
 * in, so this endpoint answers them before anything is written.
 *
 * POST /api/attendance/preview
 * Body: classId, heldAt, customerIds
 */
export async function previewAttendance(req, res) {
  const { classId, heldAt, customerIds } = req.body;

  const when = heldAt ? new Date(heldAt) : new Date();
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({
      error: 'Invalid date',
      message: 'The date and time of the class are not a valid date.',
    });
  }

  const { error, classDoc, assessments } = await assessSheet({
    classId,
    heldAt: when,
    customerIds,
    user: req.user,
  });

  if (error) return res.status(error.status).json(error.body);

  res.json({
    class: {
      classId: classDoc.classId,
      day: classDoc.day,
      time: classDoc.time,
      classType: classDoc.classType,
    },
    heldAt: when,
    scheduleWarning: scheduleMismatch(classDoc, when),
    attendees: assessments,
    // UC6 step 8: who cannot cover the class.
    insufficient: assessments.filter((entry) => entry.insufficient),
  });
}

/**
 * Save the sheet. UC6 steps 7-10.
 *
 * POST /api/attendance
 * Body: classId, heldAt, customerIds, allowNegativeBalance
 */
export async function createAttendance(req, res) {
  const { classId, heldAt, customerIds, allowNegativeBalance = false } = req.body;

  const when = heldAt ? new Date(heldAt) : new Date();
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({
      error: 'Invalid date',
      message: 'The date and time of the class are not a valid date.',
    });
  }

  const { error, classDoc, assessments } = await assessSheet({
    classId,
    heldAt: when,
    customerIds,
    user: req.user,
  });

  if (error) return res.status(error.status).json(error.body);

  /**
   * UC6 step 8. Anyone short of a class stops the save ONCE, with the names
   * and what each would go down to. Sending the same request again with
   * allowNegativeBalance goes ahead and records the negative balance, which
   * is what the specification asks for: "YogiTrack gives the option to
   * continue save the customer record with a negative balance to be resolved
   * later."
   */
  const short = assessments.filter((entry) => entry.insufficient);

  if (short.length > 0 && !allowNegativeBalance) {
    return res.status(409).json({
      error: 'Insufficient class balance',
      requiresConfirmation: true,
      message:
        short.length === 1
          ? `${short[0].fullName} has no classes left. Check them in anyway?`
          : `${short.length} customers have no classes left. Check them in anyway?`,
      insufficient: short,
      scheduleWarning: scheduleMismatch(classDoc, when),
    });
  }

  const sheet = new Attendance({
    classId: classDoc.classId,
    // Taken from the class, not from the request: who led it is a fact about
    // the class, and UC7 pays the instructor on it.
    instructorId: classDoc.instructorId,
    heldAt: when,
    attendees: assessments.map((entry) => ({
      customerId: entry.customerId,
      usedUnlimited: entry.usedUnlimited,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
    })),
  });

  await sheet.validate({ pathsToSkip: ['attendanceId'] });

  sheet.attendanceId = await generateId('attendance');
  await sheet.save();

  /**
   * UC6 step 10: update every attendee's balance and tell them.
   *
   * The sheet is written first, for the same reason as in UC5: if a balance
   * update failed, a recorded sheet with an un-deducted balance is visible
   * and fixable, while a deducted balance with no sheet is not.
   *
   * Only customers who actually spent a class are updated. $inc by -1 rather
   * than writing balanceAfter: the increment is relative, so a sale recorded
   * in the seconds between the assessment and this write is not overwritten.
   */
  const notifications = [];

  for (const entry of assessments) {
    let balance = entry.balanceAfter;

    if (!entry.usedUnlimited) {
      const updated = await Customer.findOneAndUpdate(
        { customerId: entry.customerId },
        { $inc: { classBalance: -1 } },
        { new: true }
      );
      balance = updated.classBalance;
    }

    // Fetched again only when nothing was deducted, so the message still
    // carries a real balance for an unlimited customer.
    const customer = await Customer.findOne({ customerId: entry.customerId });

    const notification = await sendMessage(
      customer,
      checkInMessage(customer.firstName, when, balance)
    );

    notifications.push({
      customerId: entry.customerId,
      fullName: entry.fullName,
      balance,
      usedUnlimited: entry.usedUnlimited,
      ...notification,
    });
  }

  res.status(201).json({
    message: `Attendance ${sheet.attendanceId} saved: ${sheet.attendees.length} checked in.`,
    attendance: sheet,
    scheduleWarning: scheduleMismatch(classDoc, when),
    notifications,
  });
}

/**
 * List attendance sheets, newest first. An instructor sees only their own.
 *
 * GET /api/attendance
 * GET /api/attendance?classId=L00001
 */
export async function listAttendance(req, res) {
  const filter = {};

  if (req.query.classId) {
    filter.classId = String(req.query.classId).toUpperCase();
  }

  // Narrowed from the signed-in user's token, never from a query parameter.
  if (req.user.role === 'instructor') {
    filter.instructorId = req.user.instructorId;
  }

  const sheets = await Attendance.find(filter).sort({ heldAt: -1 }).limit(100);

  // Names for the IDs, one query for all of them.
  const customerIds = [
    ...new Set(sheets.flatMap((sheet) => sheet.attendees.map((a) => a.customerId))),
  ];
  const customers = await Customer.find({ customerId: { $in: customerIds } });
  const nameById = new Map(
    customers.map((customer) => [customer.customerId, customer.fullName])
  );

  res.json({
    count: sheets.length,
    attendance: sheets.map((sheet) => ({
      ...sheet.toJSON(),
      attendees: sheet.attendees.map((attendee) => ({
        ...attendee.toJSON(),
        fullName: nameById.get(attendee.customerId) || 'Unknown customer',
      })),
    })),
  });
}
