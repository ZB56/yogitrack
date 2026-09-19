/**
 * server/models/Instructor.js
 * ---------------------------
 * The instructors collection — UC1, "Add an instructor".
 *
 * A Mongoose schema is the shape and the rules for one kind of document.
 * Java analogy: the schema is the class definition, the exported model is the
 * class you call static methods on (Instructor.find(), Instructor.create()),
 * and every saved document is an instance.
 */

import mongoose from 'mongoose';
import { personFields } from './personFields.js';

const instructorSchema = new mongoose.Schema(
  {
    // The human-readable ID from UC1: "I00123". Assigned by the controller via
    // services/idGenerator.js, never typed by the manager.
    instructorId: {
      type: String,
      required: true,
      unique: true, // creates a unique index; MongoDB rejects a second I00001
      immutable: true, // once set it can never change, even by a later update
    },

    // firstName, lastName, address, phone, email, preferredContact.
    // `...` spreads every key of the returned object into this one, the way
    // extending a base class would inherit its fields.
    ...personFields(),

    // Not in the written spec. Decision #9: deletes are risky once an
    // instructor has classes, so Part 2 will deactivate rather than remove.
    // The field exists now so no data migration is needed later.
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    // Adds createdAt and updatedAt, maintained by Mongoose automatically.
    // Useful for the reports in UC7 and for ordering the list newest-first.
    timestamps: true,
  }
);

/**
 * A virtual is a property computed on read and never stored in the database.
 * Java analogy: a getter with no backing field.
 * This gives every instructor a `fullName` without duplicating the two names.
 */
instructorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtuals are left out of JSON by default, so the React client would never
// see fullName. These two lines include them when a document is serialised.
instructorSchema.set('toJSON', { virtuals: true });
instructorSchema.set('toObject', { virtuals: true });

/**
 * An index makes a query fast by letting MongoDB look values up directly
 * instead of scanning every document. UC1 step 2 looks an instructor up by
 * name on every single save, so that lookup gets an index.
 */
instructorSchema.index({ lastName: 1, firstName: 1 });

export default mongoose.model('Instructor', instructorSchema);
