/**
 * server/scripts/seedPackages.js
 * ------------------------------
 * Loads the studio's real price list (Fig. 2 of the requirements) into the
 * packages collection.
 *
 * Why this exists: UC3 lets a manager add packages one at a time through the
 * form, which is the use case. But the studio already has a fixed price list,
 * and typing all seven rows by hand to demonstrate or test the application is
 * wasted effort. This script is a development convenience, not part of any
 * use case.
 *
 *     Single Class (Drop in)                          $20
 *     4 Class Pass    - validity one month            $70
 *     10 Class Pass   - validity three months        $140
 *     3 Months Unlimited                             $400
 *     Seniors (62 and older):
 *     4 Class Pass    - validity one month            $60
 *     10 Class Pass   - validity three months        $120
 *     3 Months Unlimited                             $360
 *
 * Run with:  npm run seed:packages
 *
 * It is safe to run more than once: a package whose name already exists is
 * skipped rather than duplicated.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectToDatabase } from '../config/db.js';
import Package from '../models/Package.js';
import { generateId } from '../services/idGenerator.js';

/**
 * Validity periods come from the price list itself ("validity one month",
 * "validity three months"). The window starts today, so seeded packages are
 * current and can be used straight away.
 */
const today = new Date();

/** @param {number} months @returns {Date} today plus that many months */
function monthsFromToday(months) {
  const date = new Date(today);
  date.setMonth(date.getMonth() + months);
  return date;
}

// Every package is 'General' class type: the price list describes regular
// weekly classes. Special-type packages (e.g. Yoga with Weights) are priced
// per workshop and are not on this list.
const PRICE_LIST = [
  {
    name: 'Single Class (Drop in)',
    category: 'General',
    unlimited: false,
    numClasses: 1,
    validityMonths: 1,
    price: 20,
  },
  {
    name: '4 Class Pass',
    category: 'General',
    unlimited: false,
    numClasses: 4,
    validityMonths: 1,
    price: 70,
  },
  {
    name: '10 Class Pass',
    category: 'General',
    unlimited: false,
    numClasses: 10,
    validityMonths: 3,
    price: 140,
  },
  {
    name: '3 Months Unlimited',
    category: 'General',
    unlimited: true,
    numClasses: null,
    validityMonths: 3,
    price: 400,
  },
  {
    name: '4 Class Pass (Senior)',
    category: 'Senior',
    unlimited: false,
    numClasses: 4,
    validityMonths: 1,
    price: 60,
  },
  {
    name: '10 Class Pass (Senior)',
    category: 'Senior',
    unlimited: false,
    numClasses: 10,
    validityMonths: 3,
    price: 120,
  },
  {
    name: '3 Months Unlimited (Senior)',
    category: 'Senior',
    unlimited: true,
    numClasses: null,
    validityMonths: 3,
    price: 360,
  },
];

async function seed() {
  await connectToDatabase();

  let created = 0;
  let skipped = 0;

  for (const row of PRICE_LIST) {
    // Skip anything already on file, so re-running is harmless.
    const existing = await Package.findOne({ name: row.name });
    if (existing) {
      console.log(`  skip    ${row.name} (already exists as ${existing.packageId})`);
      skipped += 1;
      continue;
    }

    const doc = new Package({
      name: row.name,
      category: row.category,
      classType: 'General',
      unlimited: row.unlimited,
      numClasses: row.numClasses,
      startDate: today,
      endDate: monthsFromToday(row.validityMonths),
      price: row.price,
    });

    // Same order as the controller: validate, then take an ID, then save.
    await doc.validate({ pathsToSkip: ['packageId'] });
    doc.packageId = await generateId('package');
    await doc.save();

    console.log(`  created ${doc.packageId}  ${row.name}  $${row.price}`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} already present.`);

  // A script must close the connection explicitly, or the process hangs:
  // Mongoose keeps the socket open waiting for more work.
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
