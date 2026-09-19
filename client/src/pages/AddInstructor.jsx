/**
 * client/src/pages/AddInstructor.jsx
 * ----------------------------------
 * UC1 — Add an instructor. The full flow from docs/04-use-cases.md:
 *
 *   step 1    the manager enters first and last name
 *   steps 2-3 the name is checked; a match prompts for confirmation
 *   step 4    the server generates the I##### id
 *   steps 5-6 the rest of the data is entered and validated
 *   step 7    the save is confirmed
 *   step 8    a welcome message goes to the preferred contact method
 *
 * ---------------------------------------------------------------------------
 * How React state works, since it has no direct Java equivalent
 *
 * useState gives the component a value plus a function to replace it:
 *
 *     const [values, setValues] = useState(EMPTY_FORM);
 *
 * Calling setValues does NOT change `values` on the spot the way an assignment
 * would in Java. It schedules a re-render, and on that next render the
 * component function runs again from the top with the new value. So the state
 * is never mutated in place — a new object replaces the old one every time.
 * That is why the change handler below builds `{ ...previous, [name]: value }`
 * instead of writing `values.firstName = ...`.
 * ---------------------------------------------------------------------------
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import RadioGroup from '../components/RadioGroup.jsx';
import Alert from '../components/Alert.jsx';
import { checkInstructorName, createInstructor } from '../api/instructors.js';

// The form's starting values. Every field starts as an empty string rather
// than undefined, because an input whose value is undefined is "uncontrolled"
// and React warns when it later becomes controlled.
const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  email: '',
  preferredContact: '',
};

/**
 * Check the form before sending it (UC1 step 6, client half).
 *
 * The server validates the same rules in the Mongoose schema and is the real
 * authority — a request can always reach it without going through this page.
 * Checking here too simply spares the manager a network round trip to be told
 * about an empty field.
 *
 * @param {object} values
 * @returns {object} field name -> error message, empty when the form is valid
 */
function validateForm(values) {
  const errors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.address.trim()) errors.address = 'Address is required.';

  if (!values.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(values.phone.trim())) {
    errors.phone = 'Please enter a valid 10-digit phone number.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.preferredContact) {
    errors.preferredContact = 'Please choose a preferred contact method.';
  }

  return errors;
}

export default function AddInstructor() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // A single status string instead of several booleans. Three separate flags
  // could contradict each other (saving and saved at once); one string cannot.
  const [status, setStatus] = useState('idle'); // idle | checking | saving

  const [duplicatePrompt, setDuplicatePrompt] = useState(null); // UC1 step 3
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null); // UC1 steps 7-8, on success

  /**
   * Runs on every keystroke. `event.target.name` matches the key in `values`,
   * which is why each input's name is the same as its state field: one handler
   * serves every input instead of one handler per field.
   */
  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({ ...previous, [name]: value }));

    // Clear this field's error as soon as the manager starts fixing it.
    // Leaving the message under a field being corrected reads as broken.
    setErrors((previous) => {
      if (!previous[name]) return previous; // nothing to clear; avoid a re-render
      const next = { ...previous };
      delete next[name];
      return next;
    });

    // Any edit invalidates a pending duplicate prompt: the name may have
    // just changed, so the earlier answer no longer applies.
    setDuplicatePrompt(null);
  }

  /**
   * Send the record to the server (UC1 steps 4-8).
   *
   * @param {boolean} confirmDuplicate - true when the manager has already
   *   answered the "someone with this name exists" prompt
   */
  async function save(confirmDuplicate) {
    setStatus('saving');
    setSubmitError(null);

    try {
      const response = await createInstructor({
        ...values,
        confirmDuplicate,
      });

      // UC1 steps 7-8: show the confirmation and the generated id, and reset
      // the form so the manager can immediately add the next instructor.
      setResult(response);
      setValues(EMPTY_FORM);
      setErrors({});
      setDuplicatePrompt(null);
    } catch (error) {
      // The server's own duplicate guard, reached if the check below was
      // somehow skipped. Show the same prompt rather than a raw error.
      if (error.requiresConfirmation) {
        setDuplicatePrompt(error.message);
      } else if (error.fields) {
        // Per-field validation messages from the Mongoose schema (UC1 step 6).
        setErrors(error.fields);
        setSubmitError('Please correct the highlighted fields.');
      } else {
        setSubmitError(error.message);
      }
    } finally {
      // `finally` runs whether or not an error was thrown, so the button can
      // never be left stuck in its disabled "Saving..." state.
      setStatus('idle');
    }
  }

  /**
   * Submit handler: validate, then check the name, then save.
   */
  async function handleSubmit(event) {
    // A plain HTML form submit reloads the whole page, which would throw away
    // all React state. preventDefault stops that so JavaScript can handle it.
    event.preventDefault();

    setResult(null);
    setSubmitError(null);

    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // UC1 step 2: ask the server whether this name is already on file.
    setStatus('checking');
    try {
      const check = await checkInstructorName(
        values.firstName.trim(),
        values.lastName.trim()
      );

      if (check.exists) {
        // UC1 step 3: do not save yet. Two instructors really can share a
        // name, so this is a question, not a rejection.
        setStatus('idle');
        setDuplicatePrompt(
          `${check.count} instructor${check.count > 1 ? 's are' : ' is'} already ` +
          `recorded as ${values.firstName.trim()} ${values.lastName.trim()}. ` +
          `Add this person as well?`
        );
        return;
      }
    } catch (error) {
      // If the lookup itself fails, say so rather than saving blind: silently
      // continuing could create the duplicate the check exists to prevent.
      setStatus('idle');
      setSubmitError(`Could not check for existing instructors: ${error.message}`);
      return;
    }

    await save(false);
  }

  const isBusy = status === 'checking' || status === 'saving';

  return (
    <>
      <div className="page-header">
        <h1>Add an instructor</h1>
        <p>
          Use case 1. YogiTrack assigns the instructor ID automatically and
          sends a welcome message on the contact method chosen below.
        </p>
      </div>

      {/* UC1 steps 7-8: confirmation, the generated id, and the message. */}
      {result && (
        <Alert variant="success" title="Instructor saved">
          <p>
            <strong>{result.instructor.fullName}</strong> was added with
            instructor ID <strong>{result.instructor.instructorId}</strong>.
          </p>
          <div className="message-preview">
            <div className="message-preview__channel">
              Welcome message sent by {result.notification.channel} to{' '}
              {result.notification.address}
            </div>
            {result.notification.text}
          </div>
          <div className="alert__actions">
            <Link className="btn btn--secondary" to="/instructors">
              View all instructors
            </Link>
          </div>
        </Alert>
      )}

      {/* UC1 step 3: the duplicate-name question. */}
      {duplicatePrompt && (
        <Alert variant="warning" title="This name already exists">
          <p>{duplicatePrompt}</p>
          <div className="alert__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => save(true)}
              disabled={isBusy}
            >
              {status === 'saving' ? 'Saving…' : 'Yes, add anyway'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setDuplicatePrompt(null)}
              disabled={isBusy}
            >
              Cancel and edit
            </button>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not save">
          <p>{submitError}</p>
        </Alert>
      )}

      <div className="card">
        {/* noValidate turns off the browser's own popups so the messages the
            manager sees are ours, worded consistently and placed by the field. */}
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="form__section">
            <legend className="form__section-title">Name</legend>
            <div className="form__grid">
              <FormField
                name="firstName"
                label="First name"
                value={values.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
                autoComplete="given-name"
              />
              <FormField
                name="lastName"
                label="Last name"
                value={values.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
                autoComplete="family-name"
              />
            </div>
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">Contact details</legend>
            <div className="form__grid">
              <FormField
                name="address"
                label="Address"
                value={values.address}
                onChange={handleChange}
                error={errors.address}
                hint="Street, city, state and ZIP"
                required
                fullWidth
                autoComplete="street-address"
              />
              <FormField
                name="phone"
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={handleChange}
                error={errors.phone}
                hint="e.g. 555-123-4567"
                required
                autoComplete="tel"
              />
              <FormField
                name="email"
                label="Email"
                type="email"
                value={values.email}
                onChange={handleChange}
                error={errors.email}
                required
                autoComplete="email"
              />
            </div>
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">Preferences</legend>
            <div className="form__grid">
              <RadioGroup
                name="preferredContact"
                legend="Preferred mode of communication"
                value={values.preferredContact}
                onChange={handleChange}
                error={errors.preferredContact}
                required
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                ]}
              />
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={isBusy}>
              {status === 'checking'
                ? 'Checking name…'
                : status === 'saving'
                  ? 'Saving…'
                  : 'Save instructor'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setValues(EMPTY_FORM);
                setErrors({});
                setDuplicatePrompt(null);
                setSubmitError(null);
              }}
              disabled={isBusy}
            >
              Clear form
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
