/**
 * server/services/idGenerator.js
 * ------------------------------
 * Produces the human-readable IDs the use cases require: I00123 for an
 * instructor, C00123 for a customer, P00123 for a package.
 *
 * These are separate from MongoDB's own `_id`. MongoDB's _id is a 24-character
 * ObjectId — correct for the database but not something a studio manager can
 * read over the phone. Both are kept: _id for joins between collections,
 * instructorId/customerId for humans.
 */

import Counter from '../models/Counter.js';

// Which letter prefixes which kind of record. UC1 and UC4 require I and C
// specifically so the two ID types can be told apart at a glance.
const PREFIXES = {
  instructor: 'I',
  customer: 'C',
  package: 'P',
  class: 'L', // "cLass" — C is already taken by customer
  sale: 'S',
};

// Width of the zero-padded number. 5 digits matches the I00123 example in the
// use cases and leaves room for 99,999 records of each type.
const NUMBER_WIDTH = 5;

/**
 * Reserve the next ID for a kind of record.
 *
 * @param {string} kind - a key of PREFIXES, e.g. 'instructor'
 * @returns {Promise<string>} the formatted ID, e.g. "I00001"
 */
export async function generateId(kind) {
  const prefix = PREFIXES[kind];
  if (!prefix) {
    throw new Error(`generateId: unknown record type "${kind}"`);
  }

  // findOneAndUpdate is one round trip to MongoDB that finds, modifies and
  // returns the document without any gap another request could slip into.
  const counter = await Counter.findOneAndUpdate(
    { _id: kind },              // which counter
    { $inc: { seq: 1 } },       // add one to seq
    {
      new: true,    // return the document AFTER the increment, not before
      upsert: true, // create the counter document if this is the first ever ID
    }
  );

  // padStart pads the left side with '0' until the string is NUMBER_WIDTH long:
  // 1 -> "00001", 123 -> "00123". Java equivalent: String.format("%05d", n).
  return `${prefix}${String(counter.seq).padStart(NUMBER_WIDTH, '0')}`;
}
