/**
 * server/models/personFields.js
 * -----------------------------
 * The fields UC1 (instructor) and UC4 (customer) have in common.
 *
 * Both use cases ask for exactly the same demographic data: first name, last
 * name, address, phone, email and preferred contact method. Writing those
 * rules twice would mean two places to keep in step every time a validation
 * message changes, so they are defined once here and spread into both schemas.
 *
 * Java analogy: an abstract base class holding shared fields. Mongoose has no
 * schema inheritance, so the equivalent is a plain object that each schema
 * copies in with the `...` spread operator.
 */

// Basic shape check for an email address: something, an @, something, a dot,
// something. Deliberately loose — the only way to truly validate an email is
// to send to it, and over-strict patterns reject valid real addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts the formats a US studio would actually type:
// 5551234567, 555-123-4567, (555) 123-4567, +1 555 123 4567
const PHONE_PATTERN = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

/**
 * Shared field definitions for a person (instructor or customer).
 * Called as a function so each schema gets its own fresh copy of the objects
 * rather than sharing one — shared objects would let a change to one schema
 * silently affect the other.
 *
 * @returns {object} Mongoose field definitions
 */
export function personFields() {
  return {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true, // strips accidental leading/trailing spaces before saving
      maxlength: [50, 'First name cannot exceed 50 characters.'],
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters.'],
    },

    // The use cases list "Address" as a single item, so it is stored as one
    // free-text field rather than split into street/city/state/zip. Assumption
    // documented in the project report.
    address: {
      type: String,
      required: [true, 'Address is required.'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters.'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      match: [PHONE_PATTERN, 'Please enter a valid 10-digit phone number.'],
    },

    email: {
      type: String,
      required: [true, 'Email address is required.'],
      trim: true,
      lowercase: true, // normalises Ann@X.com and ann@x.com to one value
      match: [EMAIL_PATTERN, 'Please enter a valid email address.'],
    },

    // `enum` restricts the value to this list, the way a Java enum type would.
    // The React form offers the same two choices, so this is the server-side
    // guarantee behind what the UI already prevents.
    preferredContact: {
      type: String,
      required: [true, 'Please choose a preferred contact method.'],
      enum: {
        values: ['phone', 'email'],
        message: 'Preferred contact must be either phone or email.',
      },
    },
  };
}
