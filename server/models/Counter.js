/**
 * server/models/Counter.js
 * ------------------------
 * Holds the last number handed out for each kind of human-readable ID
 * (instructor, customer, package, ...). One document per ID type:
 *
 *     { _id: "instructor", seq: 12 }
 *     { _id: "customer",   seq: 47 }
 *
 * Design decision #1 in docs/07-design-decisions.md: IDs come from an atomic
 * counter, NOT from counting existing documents. Counting is a read followed
 * by a write, and two managers saving at the same moment would both read 12
 * and both write 13 — a lost update. `$inc` is a single atomic operation
 * inside MongoDB, so each caller is guaranteed a different number.
 */

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  // Using a String _id instead of MongoDB's default ObjectId lets the name of
  // the counter ("instructor") BE the primary key, so lookups need no index
  // of their own and duplicates are impossible.
  _id: {
    type: String,
    required: true,
  },

  // The last number issued. The first ID generated will be seq 1 -> I00001.
  seq: {
    type: Number,
    required: true,
    default: 0,
  },
});

// `mongoose.model()` compiles the schema into a model — the thing you actually
// call .find() and .create() on. Java analogy: the schema is the class
// definition, the model is the class object you invoke static methods on, and
// each document is an instance.
export default mongoose.model('Counter', counterSchema);
