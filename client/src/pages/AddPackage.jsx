/**
 * client/src/pages/AddPackage.jsx
 * -------------------------------
 * UC3 — Add a package.
 *
 * The simplest of the three Part 1 use cases: the manager enters the data and
 * YogiTrack generates a package ID and confirms. There is no duplicate check
 * and no branch, which is why this page does not use the shared PersonForm —
 * it collects entirely different fields.
 *
 * The one piece of real design here is how "unlimited" is collected. The
 * specification lists the number of classes as "1, 4, 10, or unlimited", so
 * the form offers those four as one set of radio buttons. Choosing Unlimited
 * sends `unlimited: true` with no class count, rather than a magic number.
 * See design decision 4.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import RadioGroup from '../components/RadioGroup.jsx';
import Alert from '../components/Alert.jsx';
import { createPackage } from '../api/packages.js';

// `classes` holds the radio selection as a string, including the literal
// 'unlimited'. It is translated into the two fields the API expects at submit
// time, so the form state stays simple.
const EMPTY_FORM = {
  name: '',
  category: '',
  classes: '',
  classType: '',
  startDate: '',
  endDate: '',
  price: '',
};

// The counts the studio actually sells, matching ALLOWED_CLASS_COUNTS on the
// server. Kept in step by hand; the server is the authority.
const CLASS_OPTIONS = [
  { value: '1', label: '1 (drop-in)' },
  { value: '4', label: '4 classes' },
  { value: '10', label: '10 classes' },
  { value: 'unlimited', label: 'Unlimited' },
];

/**
 * Check the form before sending it. The Mongoose schema enforces the same
 * rules and is the real authority; this only saves a round trip.
 *
 * @returns {object} field name -> message, empty when valid
 */
function validateForm(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = 'Package name is required.';
  if (!values.category) errors.category = 'Please choose a package category.';
  if (!values.classes) errors.classes = 'Please choose how many classes this package includes.';
  if (!values.classType) errors.classType = 'Please choose a class type.';
  if (!values.startDate) errors.startDate = 'Start date is required.';

  if (!values.endDate) {
    errors.endDate = 'End date is required.';
  } else if (values.startDate && values.endDate <= values.startDate) {
    // Both are ISO date strings (yyyy-mm-dd), which compare correctly as
    // text — the most significant digits come first.
    errors.endDate = 'End date must be after the start date.';
  }

  if (values.price === '') {
    errors.price = 'Price is required.';
  } else if (Number.isNaN(Number(values.price))) {
    errors.price = 'Price must be a number.';
  } else if (Number(values.price) < 0) {
    errors.price = 'Price cannot be negative.';
  }

  return errors;
}

export default function AddPackage() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({ ...previous, [name]: value }));

    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    // Stop the browser reloading the page, which would discard React state.
    event.preventDefault();

    setResult(null);
    setSubmitError(null);

    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const isUnlimited = values.classes === 'unlimited';

      const response = await createPackage({
        name: values.name,
        category: values.category,
        classType: values.classType,
        startDate: values.startDate,
        endDate: values.endDate,
        // The form holds everything as text; the API expects a number.
        price: Number(values.price),
        unlimited: isUnlimited,
        numClasses: isUnlimited ? null : Number(values.classes),
      });

      setResult(response);
      setValues(EMPTY_FORM);
      setErrors({});
    } catch (error) {
      if (error.fields) {
        // Per-field messages from the Mongoose schema. The server names the
        // field `numClasses`, but the form's radio group is called `classes`,
        // so that one message is moved across to the control it belongs to.
        const { numClasses, ...rest } = error.fields;
        setErrors(numClasses ? { ...rest, classes: numClasses } : rest);
        setSubmitError('Please correct the highlighted fields.');
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Add a package</h1>
        <p>
          Use case 3. A package is what the studio sells: a number of classes,
          valid between two dates, at a price. YogiTrack assigns the package ID
          automatically.
        </p>
      </div>

      {result && (
        <Alert variant="success" title="Package added">
          <p>
            <strong>{result.package.name}</strong> was added with package ID{' '}
            <strong>{result.package.packageId}</strong> —{' '}
            {result.package.classesLabel}, {result.package.category} rate, at $
            {result.package.price}.
          </p>
          <div className="alert__actions">
            <Link className="btn btn--secondary" to="/packages">
              View all packages
            </Link>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not save">
          <p>{submitError}</p>
        </Alert>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="form__section">
            <legend className="form__section-title">Package</legend>
            <div className="form__grid">
              <FormField
                name="name"
                label="Package name"
                value={values.name}
                onChange={handleChange}
                error={errors.name}
                hint="e.g. 10 Class Pass"
                required
                fullWidth
              />
              <RadioGroup
                name="category"
                legend="Package category"
                value={values.category}
                onChange={handleChange}
                error={errors.category}
                required
                options={[
                  { value: 'General', label: 'General' },
                  { value: 'Senior', label: 'Senior (62 and older)' },
                ]}
              />
              <RadioGroup
                name="classes"
                legend="Number of classes"
                value={values.classes}
                onChange={handleChange}
                error={errors.classes}
                required
                options={CLASS_OPTIONS}
              />
              <RadioGroup
                name="classType"
                legend="Class type"
                value={values.classType}
                onChange={handleChange}
                error={errors.classType}
                required
                options={[
                  { value: 'General', label: 'General' },
                  { value: 'Special', label: 'Special' },
                ]}
              />
            </div>
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">Validity and price</legend>
            <div className="form__grid">
              <FormField
                name="startDate"
                label="Start date"
                type="date"
                value={values.startDate}
                onChange={handleChange}
                error={errors.startDate}
                required
              />
              <FormField
                name="endDate"
                label="End date"
                type="date"
                value={values.endDate}
                onChange={handleChange}
                error={errors.endDate}
                required
              />
              <FormField
                name="price"
                label="Price (USD)"
                type="number"
                value={values.price}
                onChange={handleChange}
                error={errors.price}
                hint="The studio's rates run from $20 to $400"
                required
                min="0"
                step="0.01"
              />
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save package'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setValues(EMPTY_FORM);
                setErrors({});
                setSubmitError(null);
              }}
              disabled={saving}
            >
              Clear form
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
