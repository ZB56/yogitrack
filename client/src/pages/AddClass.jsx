/**
 * client/src/pages/AddClass.jsx
 * -----------------------------
 * UC2 — Add a class.
 *
 * The flow this screen implements, step by step:
 *
 *   1. The manager enters the instructor, day, time, length, type and pay rate.
 *   2. As soon as a day and time are present, YogiTrack checks the slot
 *      against the schedule, because only one class can run at a time.
 *   3. On a clash it says which class is in the way and offers free slots.
 *   4. Clicking a suggestion moves the form to it.
 *   5. The manager saves, which publishes it to the schedule.
 *   6. YogiTrack confirms to the instructor and to the studio.
 *
 * Step 2 runs while the form is being filled in rather than only on submit:
 * finding out about a clash before pressing Save is the difference between a
 * suggestion and a rejection. The server repeats the check on save regardless
 * (see classController.createClass), because the browser is not where a rule
 * can live.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import RadioGroup from '../components/RadioGroup.jsx';
import Alert from '../components/Alert.jsx';
import { listInstructors } from '../api/instructors.js';
import { checkClassConflict, createClass } from '../api/classes.js';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Matches DEFAULT_DURATION_MINUTES on the server. The specification gives no
// class length, so 60 minutes is the stated assumption (design decision 5).
const DEFAULT_DURATION = '60';

const EMPTY_FORM = {
  instructorId: '',
  day: '',
  time: '',
  durationMinutes: DEFAULT_DURATION,
  classType: '',
  payRate: '',
};

/** Client-side mirror of the schema rules, to save a round trip. */
function validateForm(values) {
  const errors = {};

  if (!values.instructorId) errors.instructorId = 'Please choose an instructor.';
  if (!values.day) errors.day = 'Please choose a day.';
  if (!values.time) errors.time = 'Start time is required.';

  const duration = Number(values.durationMinutes);
  if (!values.durationMinutes) {
    errors.durationMinutes = 'Length is required.';
  } else if (Number.isNaN(duration) || duration < 15 || duration > 240) {
    errors.durationMinutes = 'Length must be between 15 and 240 minutes.';
  }

  if (!values.classType) errors.classType = 'Please choose a class type.';

  if (values.payRate === '') {
    errors.payRate = 'Pay rate is required.';
  } else if (Number.isNaN(Number(values.payRate))) {
    errors.payRate = 'Pay rate must be a number.';
  } else if (Number(values.payRate) < 0) {
    errors.payRate = 'Pay rate cannot be negative.';
  }

  return errors;
}

export default function AddClass() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [instructors, setInstructors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  // What the conflict check last said: null until a day and time are chosen.
  const [conflict, setConflict] = useState(null);

  // The instructor dropdown has to be filled before the manager can choose.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await listInstructors();
        if (!ignore) setInstructors(data.instructors);
      } catch (caught) {
        if (!ignore) setSubmitError(`Could not load instructors: ${caught.message}`);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * UC2 step 2, run as the form is filled in.
   *
   * The effect re-runs whenever the day, time or length changes, which is
   * exactly when the answer could be different. `ignore` guards against two
   * checks in flight at once: without it, a slow first answer could land
   * after a fast second one and show the manager a verdict for a slot they
   * have already moved away from.
   */
  useEffect(() => {
    if (!values.day || !values.time) {
      setConflict(null);
      return undefined;
    }

    let ignore = false;

    async function check() {
      try {
        const answer = await checkClassConflict({
          day: values.day,
          time: values.time,
          durationMinutes: Number(values.durationMinutes) || 60,
        });
        if (!ignore) setConflict(answer);
      } catch {
        // A failed check is not a reason to block the form: the server checks
        // again on save, which is the authoritative answer anyway.
        if (!ignore) setConflict(null);
      }
    }

    check();
    return () => {
      ignore = true;
    };
  }, [values.day, values.time, values.durationMinutes]);

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

  /** UC2 step 4: the manager picks one of the offered slots. */
  function applySuggestion(suggestion) {
    setValues((previous) => ({
      ...previous,
      day: suggestion.day,
      time: suggestion.time,
    }));
    setSubmitError(null);
  }

  async function handleSubmit(event) {
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
      const response = await createClass({
        instructorId: values.instructorId,
        day: values.day,
        time: values.time,
        durationMinutes: Number(values.durationMinutes),
        classType: values.classType,
        payRate: Number(values.payRate),
      });

      setResult(response);
      setValues(EMPTY_FORM);
      setErrors({});
      setConflict(null);
    } catch (error) {
      // A 409 carries the clash and the alternatives. Feeding it into the
      // same `conflict` state means the suggestion buttons below render it
      // identically, whether the clash was found while typing or on save.
      if (error.body?.conflict) {
        setConflict({
          conflict: true,
          clashesWith: error.body.clashesWith || [],
          suggestions: error.body.suggestions || [],
        });
        setSubmitError(error.message);
      } else if (error.fields) {
        setErrors(error.fields);
        setSubmitError('Please correct the highlighted fields.');
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasConflict = Boolean(conflict?.conflict);

  return (
    <>
      <div className="page-header">
        <h1>Add a class</h1>
        <p>
          Use case 2. A class is a weekly slot in the studio timetable. Only one
          class can run at a time, so YogiTrack checks the schedule as you fill
          this in and offers free slots if the one you want is taken.
        </p>
      </div>

      {result && (
        <Alert variant="success" title="Class scheduled">
          <p>
            <strong>{result.class.classId}</strong> runs on{' '}
            <strong>
              {result.class.day} at {result.class.time}
            </strong>{' '}
            ({result.class.durationMinutes} minutes, {result.class.classType}),
            led by {result.instructor.fullName}.
          </p>

          {/* UC2 step 6. The messages are logged rather than delivered; the
              UI shows exactly what would be sent. */}
          <div className="message-preview">
            <span className="message-preview__channel">Confirmations sent</span>
            {result.notifications.map((notification) => (
              <p key={notification.address}>
                <strong>{notification.channel}</strong> to {notification.address}:{' '}
                {notification.text}
              </p>
            ))}
          </div>

          <div className="alert__actions">
            <Link className="btn btn--secondary" to="/classes">
              View the schedule
            </Link>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not save">
          <p>{submitError}</p>
        </Alert>
      )}

      {/* UC2 step 3. A warning rather than an error: nothing has gone wrong
          yet, and the manager has somewhere to go from here. */}
      {hasConflict && (
        <Alert variant="warning" title="That slot is taken">
          {conflict.clashesWith.map((other) => (
            <p key={other.classId}>
              <strong>{other.classId}</strong> already runs on {other.day} from{' '}
              {other.time} to {other.endTime}.
            </p>
          ))}

          {conflict.suggestions.length > 0 ? (
            <>
              <p>Free slots near the one you asked for:</p>
              <div className="alert__actions">
                {conflict.suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.day}-${suggestion.time}`}
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion.day} {suggestion.time}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>
              No free slot was found nearby. Try another day, or shorten the
              class.
            </p>
          )}
        </Alert>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="form__section">
            <legend className="form__section-title">Class</legend>
            <div className="form__grid">
              <div className="field">
                <label className="field__label" htmlFor="field-instructorId">
                  Instructor
                  <span className="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-instructorId"
                  name="instructorId"
                  value={values.instructorId}
                  onChange={handleChange}
                  className={`field__input${errors.instructorId ? ' field__input--invalid' : ''}`}
                  aria-invalid={errors.instructorId ? 'true' : undefined}
                >
                  <option value="">Choose an instructor…</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.instructorId} value={instructor.instructorId}>
                      {instructor.instructorId} — {instructor.fullName}
                    </option>
                  ))}
                </select>
                {errors.instructorId ? (
                  <span className="field__error">{errors.instructorId}</span>
                ) : (
                  <span className="field__hint">Who leads this class</span>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="field-day">
                  Day
                  <span className="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-day"
                  name="day"
                  value={values.day}
                  onChange={handleChange}
                  className={`field__input${errors.day ? ' field__input--invalid' : ''}`}
                  aria-invalid={errors.day ? 'true' : undefined}
                >
                  <option value="">Choose a day…</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                {errors.day && <span className="field__error">{errors.day}</span>}
              </div>

              {/* type="time" gives a real clock picker on a phone and keeps
                  the value in the 24-hour "HH:MM" form the API expects. */}
              <FormField
                name="time"
                label="Start time"
                type="time"
                value={values.time}
                onChange={handleChange}
                error={errors.time}
                required
              />

              <FormField
                name="durationMinutes"
                label="Length (minutes)"
                type="number"
                value={values.durationMinutes}
                onChange={handleChange}
                error={errors.durationMinutes}
                hint="60 unless this is a workshop"
                required
                min="15"
                max="240"
                step="5"
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

              <FormField
                name="payRate"
                label="Pay rate (USD)"
                type="number"
                value={values.payRate}
                onChange={handleChange}
                error={errors.payRate}
                hint="What the instructor is paid for leading it"
                required
                min="0"
                step="0.01"
              />
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Publish to the schedule'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setValues(EMPTY_FORM);
                setErrors({});
                setSubmitError(null);
                setConflict(null);
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
