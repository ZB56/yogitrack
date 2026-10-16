/**
 * server/controllers/reportController.js
 * --------------------------------------
 * UC7, "Generate studio reports". The four reports the use case names:
 *
 *   1. Package sales
 *   2. Instructors, with their classes and their number of check-ins
 *   3. Customers, with their packages (active, future or expired)
 *   4. Teacher payment for a month, from the pay rate and the classes held
 *
 * Every one is a MongoDB AGGREGATION PIPELINE rather than a query followed by
 * JavaScript. A pipeline is a list of stages, each taking the documents the
 * previous stage produced and passing on its own: $match filters, $lookup
 * joins another collection, $group collapses documents into totals, $project
 * reshapes them. It runs inside the database, so the grouping and the
 * arithmetic happen next to the data instead of after ten thousand documents
 * have been copied across the network.
 *
 * Java analogy: the Streams API (filter / map / collect) written as data and
 * executed by the database rather than by this process.
 *
 * Note for anyone reading a pipeline for the first time: `$field` means "the
 * value of that field", and `$$NOW` is the server's current time, so a
 * validity window can be judged inside the database without this file having
 * to pass a timestamp in.
 */

import Sale from '../models/Sale.js';
import Instructor from '../models/Instructor.js';
import Customer from '../models/Customer.js';
import Attendance from '../models/Attendance.js';

/**
 * Report 1 — package sales.
 *
 * What sold, how many of it, and what it brought in. Grouped on the sale's
 * own snapshot of the package name, not on a join to the packages
 * collection, so a package renamed last week does not retitle the history.
 *
 * GET /api/reports/package-sales
 */
export async function packageSalesReport(req, res) {
  const rows = await Sale.aggregate([
    {
      // One output document per package, counting and totalling as it goes.
      $group: {
        _id: { packageId: '$packageId', packageName: '$packageName' },
        unitsSold: { $sum: 1 },
        revenue: { $sum: '$amountPaid' },
        firstSoldAt: { $min: '$paidAt' },
        lastSoldAt: { $max: '$paidAt' },
      },
    },
    {
      // Rename the grouping key into plain fields and drop the _id object,
      // so the client receives a flat row rather than a nested one.
      $project: {
        _id: 0,
        packageId: '$_id.packageId',
        packageName: '$_id.packageName',
        unitsSold: 1,
        revenue: 1,
        firstSoldAt: 1,
        lastSoldAt: 1,
      },
    },
    // Best seller by revenue first: the order a studio owner would ask for.
    { $sort: { revenue: -1, packageName: 1 } },
  ]);

  const totals = rows.reduce(
    (sum, row) => ({
      unitsSold: sum.unitsSold + row.unitsSold,
      revenue: sum.revenue + row.revenue,
    }),
    { unitsSold: 0, revenue: 0 }
  );

  res.json({ rows, totals });
}

/**
 * Report 2 — instructors, their classes, and their check-ins.
 *
 * "Check-ins" is the number of people who have been marked present in the
 * classes this instructor leads, which is why it counts attendees across
 * sheets rather than counting sheets.
 *
 * GET /api/reports/instructors
 */
export async function instructorReport(req, res) {
  const rows = await Instructor.aggregate([
    {
      // $lookup is a left outer join. Each instructor gains an array of the
      // classes whose instructorId matches theirs; an instructor with none
      // gets an empty array rather than disappearing, which is what a staff
      // list has to do.
      $lookup: {
        from: 'classes',
        localField: 'instructorId',
        foreignField: 'instructorId',
        as: 'classes',
      },
    },
    {
      $lookup: {
        from: 'attendances',
        localField: 'instructorId',
        foreignField: 'instructorId',
        as: 'sheets',
      },
    },
    {
      $project: {
        _id: 0,
        instructorId: 1,
        fullName: { $concat: ['$firstName', ' ', '$lastName'] },
        email: 1,
        classes: {
          // $map is the pipeline's version of Array.map: keep four fields of
          // each class and leave the rest behind.
          $map: {
            input: '$classes',
            as: 'class',
            in: {
              classId: '$$class.classId',
              day: '$$class.day',
              time: '$$class.time',
              classType: '$$class.classType',
              payRate: '$$class.payRate',
            },
          },
        },
        classCount: { $size: '$classes' },
        classesHeld: { $size: '$sheets' },
        // Sum the length of every sheet's attendee list: one addition per
        // sheet, performed in the database.
        checkIns: {
          $sum: {
            $map: {
              input: '$sheets',
              as: 'sheet',
              in: { $size: '$$sheet.attendees' },
            },
          },
        },
      },
    },
    { $sort: { fullName: 1 } },
  ]);

  res.json({ count: rows.length, rows });
}

/**
 * Report 3 — customers and their packages, labelled active, future or
 * expired.
 *
 * The label is computed inside the pipeline from the validity dates and the
 * server's clock, so it is right at the moment the report is run. Storing a
 * status on the sale instead would mean every document in the collection
 * going stale overnight.
 *
 * GET /api/reports/customers
 */
export async function customerReport(req, res) {
  const rows = await Customer.aggregate([
    {
      $lookup: {
        from: 'sales',
        localField: 'customerId',
        foreignField: 'customerId',
        as: 'sales',
      },
    },
    {
      $project: {
        _id: 0,
        customerId: 1,
        fullName: { $concat: ['$firstName', ' ', '$lastName'] },
        email: 1,
        classBalance: 1,
        packages: {
          $map: {
            input: '$sales',
            as: 'sale',
            in: {
              saleId: '$$sale.saleId',
              packageName: '$$sale.packageName',
              unlimited: '$$sale.unlimited',
              classesPurchased: '$$sale.classesPurchased',
              validFrom: '$$sale.validFrom',
              validTo: '$$sale.validTo',
              // $switch is the pipeline's if / else if / else.
              status: {
                $switch: {
                  branches: [
                    { case: { $gt: ['$$sale.validFrom', '$$NOW'] }, then: 'future' },
                    { case: { $lt: ['$$sale.validTo', '$$NOW'] }, then: 'expired' },
                  ],
                  default: 'active',
                },
              },
            },
          },
        },
      },
    },
    { $sort: { fullName: 1 } },
  ]);

  // The counts the studio actually asks for ("how many people have a live
  // package?"), derived from the rows so the summary cannot contradict them.
  const summary = rows.reduce(
    (totals, row) => {
      const hasActive = row.packages.some((entry) => entry.status === 'active');
      return {
        customers: totals.customers + 1,
        withActivePackage: totals.withActivePackage + (hasActive ? 1 : 0),
        negativeBalances: totals.negativeBalances + (row.classBalance < 0 ? 1 : 0),
      };
    },
    { customers: 0, withActivePackage: 0, negativeBalances: 0 }
  );

  res.json({ count: rows.length, rows, summary });
}

/**
 * Report 4 — teacher payment for one month.
 *
 * Assumption, recorded in the project report: the pay rate on a class is what
 * the instructor earns each time that class is HELD, and a class counts as
 * held when an attendance sheet exists for it. UC7 says the report is "based
 * on the pay-rate and class check-ins"; paying per head would make an
 * instructor's income depend on how many people turned up, which is not how
 * a studio pays a teacher. The number of check-ins is reported alongside the
 * payment, so both readings are visible.
 *
 * GET /api/reports/teacher-payments?month=2026-10
 */
export async function teacherPaymentReport(req, res) {
  // Default to the current month. The 'YYYY-MM' form is what an
  // <input type="month"> sends.
  const monthParameter = req.query.month || '';
  const match = /^(\d{4})-(\d{2})$/.exec(monthParameter);

  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();

  if (monthIndex < 0 || monthIndex > 11) {
    return res.status(400).json({
      error: 'Invalid month',
      message: 'Month must be in the form 2026-10.',
    });
  }

  // Local-time month boundaries: the studio's month, not UTC's. Day 0 of the
  // next month is the last day of this one, which avoids having to know how
  // long the month is or whether it is a leap year.
  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  const rows = await Attendance.aggregate([
    // $match first, and on an indexed field, so every later stage works on
    // one month of sheets rather than the whole collection.
    { $match: { heldAt: { $gte: monthStart, $lt: monthEnd } } },
    {
      // Join each sheet to the class it belongs to, for the pay rate.
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: 'classId',
        as: 'class',
      },
    },
    // $lookup always produces an array; $unwind turns the one-element array
    // back into a single embedded document so $class.payRate can be read.
    { $unwind: '$class' },
    {
      $group: {
        _id: '$instructorId',
        classesHeld: { $sum: 1 },
        checkIns: { $sum: { $size: '$attendees' } },
        amountDue: { $sum: '$class.payRate' },
      },
    },
    {
      // Names for the IDs, as the last step: joining before the $group would
      // have repeated the lookup for every sheet instead of once per teacher.
      $lookup: {
        from: 'instructors',
        localField: '_id',
        foreignField: 'instructorId',
        as: 'instructor',
      },
    },
    { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        instructorId: '$_id',
        fullName: {
          $cond: [
            '$instructor',
            { $concat: ['$instructor.firstName', ' ', '$instructor.lastName'] },
            'Unknown instructor',
          ],
        },
        classesHeld: 1,
        checkIns: 1,
        amountDue: 1,
      },
    },
    { $sort: { amountDue: -1 } },
  ]);

  const totals = rows.reduce(
    (sum, row) => ({
      classesHeld: sum.classesHeld + row.classesHeld,
      checkIns: sum.checkIns + row.checkIns,
      amountDue: sum.amountDue + row.amountDue,
    }),
    { classesHeld: 0, checkIns: 0, amountDue: 0 }
  );

  res.json({
    month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    monthLabel: monthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    rows,
    totals,
  });
}
