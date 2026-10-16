/**
 * server/models/User.js
 * ---------------------
 * A login account — Part 2, design decision 12.
 *
 * The use cases name two actors, Manager and Instructor, but no course
 * document says how one is told from the other. Part 1 had no authentication
 * at all, which the Part 1 review called out ("for the final submission have
 * authentication implemented"). This collection is the answer: one document
 * per person who may sign in, carrying the role that decides what they may do.
 *
 * Two things are deliberately NOT here:
 *
 *   - The password. Only a bcrypt hash is stored, and `select: false` keeps
 *     even the hash out of every query result unless it is asked for by name.
 *     A database dump therefore reveals no usable password.
 *   - The instructor's demographic data. That already lives in the
 *     `instructors` collection; an instructor account points at it by
 *     instructorId instead of copying it, so the two can never disagree.
 *
 * Java analogy: the schema is the class, `userSchema.methods` are its instance
 * methods, and `userSchema.statics` are its static methods.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Work factor for bcrypt. Each increment doubles the time taken to hash, which
// is the point: it slows an attacker who has stolen the hashes far more than
// it slows a single real login. 12 is the current conventional default and
// takes roughly a quarter of a second on this hardware.
const SALT_ROUNDS = 12;

// The two actors from the course use-case diagram. UC1-UC5 and UC7 are the
// manager's; UC6 (record attendance) is the instructor's.
export const ROLES = ['manager', 'instructor'];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true, // unique index: MongoDB itself rejects a second "manager"
      trim: true,
      lowercase: true, // so "Manager" and "manager" are the same account
      minlength: [3, 'Username must be at least 3 characters.'],
      maxlength: [30, 'Username cannot exceed 30 characters.'],
    },

    /**
     * The bcrypt hash of the password, never the password itself.
     *
     * `select: false` means this field is left out of query results by
     * default, so a handler that returns a user document cannot leak it by
     * accident. The login code asks for it explicitly with
     * `.select('+passwordHash')`.
     */
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      required: [true, 'A role is required.'],
      enum: {
        values: ROLES,
        message: 'Role must be either manager or instructor.',
      },
    },

    /**
     * Which instructor this account belongs to, e.g. "I00001".
     *
     * Required for an instructor account and absent for a manager, which is
     * why `required` is a function rather than `true`: Mongoose calls it with
     * the document as `this`. UC6 uses it to show an instructor only the
     * classes they lead.
     */
    instructorId: {
      type: String,
      default: null,
      required: [
        function () {
          return this.role === 'instructor';
        },
        'An instructor account must be linked to an instructor record.',
      ],
    },

    // Keeps the account on file but refuses it at login. Deactivating is
    // safer than deleting, for the same reason as design decision 9: an
    // attendance record references the instructor who took it.
    active: {
      type: Boolean,
      default: true,
    },

    // Useful for the report and for spotting an account nobody uses.
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hash a plain-text password.
 *
 * Static rather than an instance method because it is needed before any
 * document exists — when creating an account, the hash has to be computed to
 * build the document in the first place.
 *
 * NOTE (differs from Java): bcrypt.hash returns a Promise, so this is async
 * and every caller must await it.
 *
 * @param {string} plainPassword
 * @returns {Promise<string>} the bcrypt hash, salt included
 */
userSchema.statics.hashPassword = async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Check a password against this account's stored hash.
 *
 * bcrypt.compare re-hashes the attempt with the salt embedded in the stored
 * hash and compares the two in constant time, so the comparison itself leaks
 * no information about how much of the password was right.
 *
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.verifyPassword = async function verifyPassword(plainPassword) {
  // The document must have been loaded with .select('+passwordHash'); without
  // it the field is undefined and bcrypt.compare would throw.
  if (!this.passwordHash) {
    throw new Error(
      'verifyPassword: this document was loaded without passwordHash. ' +
        "Load it with .select('+passwordHash')."
    );
  }
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * The minimum needed by the client: who this is and what they may do.
 * Used instead of returning the document, so no field can leak by accident.
 */
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    username: this.username,
    role: this.role,
    instructorId: this.instructorId,
  };
};

export default mongoose.model('User', userSchema);
