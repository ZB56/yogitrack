/**
 * client/src/components/PersonForm.jsx
 * ------------------------------------
 * The "add a person" form, shared by UC1 (instructor) and UC4 (customer).
 *
 * WHY ONE COMPONENT INSTEAD OF TWO PAGES
 * UC1 and UC4 are the same use case applied to two kinds of person: the same
 * six fields, the same duplicate-name question, the same generated ID, the
 * same welcome message. Written twice, the two copies would drift — a fix to
 * the duplicate prompt in one would quietly not apply to the other. Written
 * once and configured by props, they cannot.
 *
 * What differs between the two is passed in: what the thing is called, which
 * API functions to call, and where the "view all" link goes.
 *
 * Java analogy: one class taking a strategy object, rather than two
 * near-identical subclasses.
 *
 * ---------------------------------------------------------------------------
 * REACT STATE, WHICH HAS NO DIRECT JAVA EQUIVALENT
 *
 *     const [values, setValues] = useState(EMPTY_FORM);
 *
 * Calling setValues does NOT change `values` on the spot the way a Java
 * assignment would. It schedules a re-render; on that next render the
 * component function runs again from the top and `values` is the new object.
 * State is replaced, never mutated in place — which is why the change handler
 * builds `{ ...previous, [name]: value }` rather than assigning to a field.
 * ---------------------------------------------------------------------------
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from './FormField.jsx';
import RadioGroup from './RadioGroup.jsx';
import Alert from './Alert.jsx';

// Every field starts as an empty string rather than undefined: an input whose
// value is undefined is "uncontrolled", and React warns when it later becomes
// controlled.
const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  email: '',
  preferredContact: '',
};

// Kept identical to the patterns in server/models/personFields.js. The server
// is the authority; these exist only to save the manager a round trip.
const PHONE_PATTERN = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check the form before sending it (UC1/UC4 step 5, client half).
 * @returns {object} field name -> message; empty when the form is valid
 */
function validateForm(values) {
  const errors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.address.trim()) errors.address = 'Address is required.';

  if (!values.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = 'Please enter a valid 10-digit phone number.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.preferredContact) {
    errors.preferredContact = 'Please choose a preferred contact method.';
  }

  return errors;
}

/**
 * @param {object} props
 * @param {string} props.noun            - "instructor" or "customer"
 * @param {string} props.title           - page heading
 * @param {string} props.intro           - sentence under the heading
 * @param {Function} props.onCheckName   - (first, last) => Promise<{exists,count}>
 * @param {Function} props.onCreate      - (data) => Promise<{...}>
 * @param {Function} props.getRecord     - picks the saved record out of the response
 * @param {Function} props.getRecordId   - reads the generated ID off that record
 * @param {string} props.listPath        - route of the matching list page
 * @param {string} props.listLabel       - text for the link to that page
 * @param {React.ReactNode} [props.extraSuccess] - anything else to show on success
 */
export default function PersonForm({
  noun,
  title,
  intro,
  onCheckName,
  onCreate,
  getRecord,
  getRecordId,
  listPath,
  listLabel,
  extraSuccess,
}) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // One status string rather than several booleans: three separate flags could
  // contradict each other (saving and saved at once); one string cannot.
  const [status, setStatus] = useState('idle'); // idle | checking | saving

  const [duplicatePrompt, setDuplicatePrompt] = useState(null); // step 2a
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null); // steps 6-7, on success

  /**
   * Runs on every keystroke. `event.target.name` matches the key in `values`,
   * so one handler serves every input instead of one handler per field.
   */
  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({ ...previous, [name]: value }));

    // Clear this field's error as soon as the manager starts correcting it.
    setErrors((previous) => {
      if (!previous[name]) return previous; // nothing to clear, skip the re-render
      const next = { ...previous };
      delete next[name];
      return next;
    });

    // Any edit invalidates a pending duplicate prompt: the name may have just
    // changed, so the earlier answer no longer applies.
    setDuplicatePrompt(null);
  }

  /**
   * Send the record to the server (steps 3-7).
   * @param {boolean} confirmDuplicate - true once the prompt has been answered
   */
  async function save(confirmDuplicate) {
    setStatus('saving');
    setSubmitError(null);

    try {
      const response = await onCreate({ ...values, confirmDuplicate });

      setResult(response);
      setValues(EMPTY_FORM);
      setErrors({});
      setDuplicatePrompt(null);
    } catch (error) {
      if (error.requiresConfirmation) {
        // The server's own duplicate guard. Show the prompt, not an error.
        setDuplicatePrompt(error.message);
      } else if (error.fields) {
        // Per-field messages from the Mongoose schema (step 5).
        setErrors(error.fields);
        setSubmitError('Please correct the highlighted fields.');
      } else {
        setSubmitError(error.message);
      }
    } finally {
      // Runs whether or not an error was thrown, so the button can never be
      // left stuck in its disabled "Saving..." state.
      setStatus('idle');
    }
  }

  /** Validate, then check the name, then save. */
  async function handleSubmit(event) {
    // A plain HTML submit reloads the page, discarding all React state.
    event.preventDefault();

    setResult(null);
    setSubmitError(null);

    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Step 2: ask the server whether this name is already on file.
    setStatus('checking');
    try {
      const check = await onCheckName(
        values.firstName.trim(),
        values.lastName.trim()
      );

      if (check.exists) {
        // Step 2a: do not save yet. Two people really can share a name, so
        // this is a question rather than a rejection.
        setStatus('idle');
        setDuplicatePrompt(
          `${check.count} ${noun}${check.count > 1 ? 's are' : ' is'} already ` +
          `recorded as ${values.firstName.trim()} ${values.lastName.trim()}. ` +
          `Add this person as well?`
        );
        return;
      }
    } catch (error) {
      // If the lookup itself fails, say so rather than saving blind: carrying
      // on could create the very duplicate the check exists to prevent.
      setStatus('idle');
      setSubmitError(`Could not check for existing ${noun}s: ${error.message}`);
      return;
    }

    await save(false);
  }

  const isBusy = status === 'checking' || status === 'saving';
  const savedRecord = result ? getRecord(result) : null;

  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>

      {/* Steps 6-7: confirmation, the generated id, and the message. */}
      {result && (
        <Alert variant="success" title={`${noun === 'instructor' ? 'Instructor' : 'Customer'} saved`}>
          <p>
            <strong>{savedRecord.fullName}</strong> was added with{' '}
            {noun} ID <strong>{getRecordId(savedRecord)}</strong>.
          </p>
          {extraSuccess && extraSuccess(savedRecord)}
          <div className="message-preview">
            <div className="message-preview__channel">
              Welcome message sent by {result.notification.channel} to{' '}
              {result.notification.address}
            </div>
            {result.notification.text}
          </div>
          <div className="alert__actions">
            <Link className="btn btn--secondary" to={listPath}>
              {listLabel}
            </Link>
          </div>
        </Alert>
      )}

      {/* Step 2a: the duplicate-name question. */}
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
        {/* noValidate turns off the browser's own popups, so every message the
            manager sees is ours: worded consistently and placed by the field. */}
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
                  : `Save ${noun}`}
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
