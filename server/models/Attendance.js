/**
 * server/models/Attendance.js
 * ---------------------------
 * The attendance collection — UC6, "Record class attendance".
 *
 * One document per OCCURRENCE of a class: the signed sheet in Fig. 4 of the
 * requirements, turned into a record. A class (models/Class.js) is a weekly
 * slot that repeats; an attendance document is the Tuesday it actually ran,
 * with the people who were there.
 *
 * Each attendee is stored as a small sub-document rather than just an ID, so
 * the sheet records what the check-in DID to that customer's balance:
 *
 *     { customerId: 'C00001', usedUnlimited: false,
 *       balanceBefore: 4, balanceAfter: 3 }
 *
 * The data-model sketch in docs/06-data-model.md had a plain array of
 * customer IDs. This is the one place the built model deliberately differs
 * from the sketch, for two reasons. UC6 step 8 allows an instructor to check
 * someone in with no classes left, leaving a negative balance "to be resolved
 * later" — and resolving it later is only possible if the sheet says what
 * happened. And the unlimited case consumes nothing at all, so without
 * usedUnlimited a reader cannot tell a free check-in from a bug.
 */

import mongoose from 'mongoose';

/**
 * One person on one sheet.
 *
 * `_id: false` because these are rows inside the parent document, not
 * documents in their own right; without it Mongoose would give each one an
 * ObjectId that nothing ever refers to.
 */
const attendeeSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // True when the customer was covered by an active unlimited package, so
    // no class was deducted. Design decision 4: unlimited is entitlement by
    // date, not a counter.
    usedUnlimited: {
      type: Boolean,
      required: true,
      default: false,
    },

    balanceBefore: {
      type: Number,
      required: true,
    },

    // May be negative. UC6 step 8 permits checking in a customer who has run
    // out, so there is deliberately no `min: 0` here, exactly as on
    // Customer.classBalance.
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    // "A00001", so a sheet can be referred to by name in a conversation.
    attendanceId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    classId: {
      type: String,
      required: [true, 'Please choose a class.'],
      uppercase: true,
      trim: true,
    },

    /**
     * Who took the register. Copied from the class rather than taken from
     * the request: the instructor who led it is a fact about the occurrence,
     * and UC7's payment report pays on it.
     */
    instructorId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    /**
     * When the class was actually held. UC6 step 4 offers the current date
     * and time with the option to change it, because a sheet is sometimes
     * typed up after the class rather than during it.
     */
    heldAt: {
      type: Date,
      required: [true, 'The date and time of the class are required.'],
    },

    attendees: {
      type: [attendeeSchema],
      // An empty sheet is a mistake, not a class nobody came to: the
      // instructor would simply not record one.
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Add at least one customer to the attendance sheet.',
      },
    },
  },
  {
    timestamps: true,
  }
);

/** How many people were checked in. */
attendanceSchema.virtual('headcount').get(function () {
  return this.attendees.length;
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

// UC7 counts check-ins per class and per instructor, and the sheet list is
// read newest first.
attendanceSchema.index({ classId: 1, heldAt: -1 });
attendanceSchema.index({ instructorId: 1, heldAt: -1 });
attendanceSchema.index({ 'attendees.customerId': 1 });

export default mongoose.model('Attendance', attendanceSchema);
