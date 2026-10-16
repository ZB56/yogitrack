/**
 * server/controllers/saleController.js
 * ------------------------------------
 * The business rules for UC5, "Record a sale".
 *
 * The use case is short but it is the one place where two collections change
 * together: a sale is written AND the customer's class balance goes up. The
 * ordering of those two writes, and what happens if the second fails, is the
 * main thing this file has to get right.
 *
 * UC5 step 4 lists three validations, and all three are implemented here:
 *   - the amount paid matches the package rate
 *   - the date and time of payment are current
 *   - the validity dates follow the package's own rules and are current
 */

import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Package from '../models/Package.js';
import { generateId } from '../services/idGenerator.js';

// Prices are stored as floating-point dollars (see the note in Package.js),
// so comparing them needs a tolerance rather than ===. Half a cent is far
// below anything a studio would charge and far above any rounding error.
const PRICE_TOLERANCE = 0.005;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight at the start of the day a timestamp falls in. */
function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Turn whatever the form sent into a Date in the studio's own timezone.
 *
 * This exists because of a genuine trap, found by testing this screen. An
 * <input type="date"> submits a bare "2026-10-15", and `new Date("2026-10-15")`
 * is specified to read a date-only string as UTC midnight. West of Greenwich
 * that is the PREVIOUS evening in local time, so a validity window starting
 * today was rejected as starting in the past.
 *
 * A date-only string therefore has its parts read out and rebuilt as a local
 * date. A full timestamp (which carries its own offset) is passed through
 * untouched.
 *
 * @param {string|Date} value
 * @returns {Date}
 */
function parseDateInput(value) {
  if (value instanceof Date) return value;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day); // local midnight, not UTC
  }

  return new Date(value);
}

/**
 * How long a package is good for, in days, taken from the package's own
 * validity window.
 *
 * This is what "start and end dates are as per the package rules" means in
 * practice: the price list says "4 Class Pass, validity one month", and the
 * package records that as a start and an end date one month apart. Buying it
 * today therefore gives a window of the same LENGTH starting today.
 *
 * @param {object} packageDoc
 * @returns {number} whole days, at least 1
 */
function packageValidityDays(packageDoc) {
  const span = packageDoc.endDate.getTime() - packageDoc.startDate.getTime();
  return Math.max(1, Math.round(span / MILLISECONDS_PER_DAY));
}

/**
 * Add whole days to a date, by the calendar rather than by arithmetic.
 *
 * The second trap this screen turned up. Adding `days * 86400000`
 * milliseconds is wrong across a daylight-saving change: the November
 * switch makes that day 25 hours long, so a 30-day window added in
 * milliseconds lands at 23:00 the EVENING BEFORE the intended date, and the
 * form then shows a validity end one day short.
 *
 * setDate() works in calendar days and lets the Date object deal with the
 * clock change, which is what "valid for one month" means to the studio.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date} local midnight, that many days later
 */
function addDays(date, days) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * The validity window a sale of this package, starting on this date, should
 * have. Used both to auto-populate the form and to check what comes back.
 *
 * @param {object} packageDoc
 * @param {Date} from
 * @returns {{validFrom: Date, validTo: Date}}
 */
function expectedValidity(packageDoc, from) {
  const validFrom = startOfDay(from);
  const validTo = addDays(validFrom, packageValidityDays(packageDoc));
  return { validFrom, validTo };
}

/**
 * What the form needs to fill itself in: the customer and the package, with
 * the amount and the validity window already worked out.
 *
 * UC5 step 2 — "YogiTrack prompts with options to enter the data listed above
 * and auto-populates 'Type of package'" — is the reason this exists. The
 * manager should not be typing a price that the system already knows.
 *
 * GET /api/sales/quote?customerId=C00001&packageId=P00003
 */
export async function quoteSale(req, res) {
  const { customerId = '', packageId = '' } = req.query;

  const customer = await Customer.findOne({ customerId: customerId.toUpperCase() });
  if (!customer) {
    return res.status(404).json({
      error: 'Unknown customer',
      message: `No customer with id ${customerId}.`,
    });
  }

  const packageDoc = await Package.findOne({ packageId: packageId.toUpperCase() });
  if (!packageDoc) {
    return res.status(404).json({
      error: 'Unknown package',
      message: `No package with id ${packageId}.`,
    });
  }

  const { validFrom, validTo } = expectedValidity(packageDoc, new Date());

  res.json({
    customer: {
      customerId: customer.customerId,
      fullName: customer.fullName,
      classBalance: customer.classBalance,
    },
    package: {
      packageId: packageDoc.packageId,
      name: packageDoc.name,
      category: packageDoc.category,
      classType: packageDoc.classType,
      classesLabel: packageDoc.classesLabel,
      unlimited: packageDoc.unlimited,
      numClasses: packageDoc.numClasses,
      price: packageDoc.price,
      isCurrent: packageDoc.isCurrent,
    },
    // What the sale should say, if it is recorded now.
    amountDue: packageDoc.price,
    validFrom,
    validTo,
    validityDays: packageValidityDays(packageDoc),
  });
}

/**
 * Record a sale. UC5 steps 1-6.
 *
 * POST /api/sales
 * Body: customerId, packageId, amountPaid, paymentMode, paidAt,
 *       validFrom, validTo
 */
export async function createSale(req, res) {
  const {
    customerId,
    packageId,
    amountPaid,
    paymentMode,
    paidAt,
    validFrom,
    validTo,
  } = req.body;

  // --- The two records this sale refers to must exist -----------------
  const customer = customerId
    ? await Customer.findOne({ customerId: String(customerId).toUpperCase() })
    : null;

  if (!customer) {
    return res.status(400).json({
      error: 'Unknown customer',
      message: 'Please choose a customer from the list.',
      fields: { customerId: 'No customer with that id.' },
    });
  }

  const packageDoc = packageId
    ? await Package.findOne({ packageId: String(packageId).toUpperCase() })
    : null;

  if (!packageDoc) {
    return res.status(400).json({
      error: 'Unknown package',
      message: 'Please choose a package from the list.',
      fields: { packageId: 'No package with that id.' },
    });
  }

  // --- UC5 step 4: validate ------------------------------------------
  // Collected rather than returned one at a time, so the manager sees
  // everything that is wrong in one pass instead of fixing three in a row.
  const fields = {};

  // "Amount paid is as per the package rate."
  const paid = Number(amountPaid);
  if (Number.isNaN(paid)) {
    fields.amountPaid = 'Amount paid must be a number.';
  } else if (Math.abs(paid - packageDoc.price) > PRICE_TOLERANCE) {
    fields.amountPaid = `${packageDoc.name} costs $${packageDoc.price.toFixed(2)}.`;
  }

  // "Date and time are current." Read as: the sale is being recorded as it
  // happens, so the timestamp is today. A future timestamp is a typo; an
  // older one would be a back-dated sale, which the use case does not allow.
  const paidTimestamp = paidAt ? parseDateInput(paidAt) : new Date();

  if (Number.isNaN(paidTimestamp.getTime())) {
    fields.paidAt = 'Date and time of payment are not a valid date.';
  } else {
    const today = startOfDay(new Date());
    const paidDay = startOfDay(paidTimestamp);

    if (paidDay.getTime() !== today.getTime()) {
      fields.paidAt = 'Date of payment must be today.';
    } else if (paidTimestamp.getTime() > Date.now() + 60 * 1000) {
      // A minute of slack, because the browser's clock and the server's
      // rarely agree to the second.
      fields.paidAt = 'Time of payment cannot be in the future.';
    }
  }

  // "Start and end dates are as per the package rules and are current."
  const requestedFrom = validFrom ? parseDateInput(validFrom) : new Date();
  const expected = expectedValidity(packageDoc, requestedFrom);

  if (Number.isNaN(requestedFrom.getTime())) {
    fields.validFrom = 'Validity start date is not a valid date.';
  } else if (startOfDay(requestedFrom) < startOfDay(new Date())) {
    fields.validFrom = 'Validity cannot start in the past.';
  }

  const requestedTo = validTo ? parseDateInput(validTo) : expected.validTo;

  if (Number.isNaN(requestedTo.getTime())) {
    fields.validTo = 'Validity end date is not a valid date.';
  } else if (startOfDay(requestedTo).getTime() !== startOfDay(expected.validTo).getTime()) {
    // The package's own rules decide the length of the window, so an end date
    // that does not match them is rejected rather than quietly corrected.
    fields.validTo =
      `${packageDoc.name} is valid for ${packageValidityDays(packageDoc)} days, ` +
      `so this should end on ${expected.validTo.toLocaleDateString('en-US')}.`;
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please correct the highlighted fields.',
      fields,
    });
  }

  // --- Write the sale -------------------------------------------------
  const sale = new Sale({
    customerId: customer.customerId,
    packageId: packageDoc.packageId,
    // Snapshot of the package as sold; see the header of models/Sale.js.
    packageName: packageDoc.name,
    classesPurchased: packageDoc.unlimited ? null : packageDoc.numClasses,
    unlimited: packageDoc.unlimited,
    amountPaid: paid,
    paymentMode,
    paidAt: paidTimestamp,
    validFrom: startOfDay(requestedFrom),
    validTo: startOfDay(requestedTo),
  });

  // Validate before taking an ID, as everywhere else (decision 15).
  await sale.validate({ pathsToSkip: ['saleId'] });

  sale.saleId = await generateId('sale');
  await sale.save();

  /**
   * UC5 step 5: update the class balance.
   *
   * An unlimited package adds nothing to the counter: entitlement for it is
   * decided by the validity dates, not by counting down (design decision 4).
   * UC6 looks for an active unlimited sale before it touches the balance.
   *
   * $inc rather than read-modify-write: it is one atomic operation inside
   * MongoDB, so two sales recorded at the same moment cannot lose one of the
   * increments. The same reasoning as the ID counter.
   *
   * Order: the sale is written first. If this update somehow failed, the
   * studio would have a recorded payment and an un-credited balance, which a
   * manager can see and fix. The other order would credit classes with no
   * record of payment, which nobody would ever notice.
   */
  const classesAdded = sale.unlimited ? 0 : sale.classesPurchased;

  const updatedCustomer = await Customer.findOneAndUpdate(
    { customerId: customer.customerId },
    { $inc: { classBalance: classesAdded } },
    { new: true } // return the document after the increment
  );

  // UC5 step 6: confirm, and show the new balance.
  res.status(201).json({
    message: `Sale ${sale.saleId} recorded for ${customer.fullName}.`,
    sale,
    customer: {
      customerId: updatedCustomer.customerId,
      fullName: updatedCustomer.fullName,
      classBalance: updatedCustomer.classBalance,
    },
    classesAdded,
  });
}

/**
 * List sales, newest first. Optionally for one customer.
 *
 * GET /api/sales
 * GET /api/sales?customerId=C00001
 */
export async function listSales(req, res) {
  const filter = {};

  if (req.query.customerId) {
    filter.customerId = String(req.query.customerId).toUpperCase();
  }

  const sales = await Sale.find(filter).sort({ paidAt: -1 });

  // Attach customer names, one query for all of them rather than one each.
  const customerIds = [...new Set(sales.map((sale) => sale.customerId))];
  const customers = await Customer.find({ customerId: { $in: customerIds } });
  const nameById = new Map(
    customers.map((customer) => [customer.customerId, customer.fullName])
  );

  res.json({
    count: sales.length,
    sales: sales.map((sale) => ({
      ...sale.toJSON(),
      customerName: nameById.get(sale.customerId) || 'Unknown customer',
    })),
  });
}
