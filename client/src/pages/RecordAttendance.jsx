/**
 * client/src/pages/RecordAttendance.jsx
 * -------------------------------------
 * UC6 — Record class attendance. The instructor's screen.
 *
 * It follows the use case step by step:
 *
 *   2. the classes this instructor leads (the server decides which those are)
 *   3. the instructor picks one
 *   4. the sheet opens with the current date and time, editable
 *   5. a warning if that does not match when the class is scheduled
 *   6. customers are ticked off the list
 *   8. anyone with no classes left is flagged, with the option to go ahead
 *  10. saving updates every balance and shows the message each person gets
 *
 * Steps 5 and 8 run against the server while the sheet is being filled in
 * (the preview endpoint), so the instructor knows about a problem before
 * pressing Save rather than after.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Alert from '../components/Alert.jsx';
import { listClasses } from '../api/classes.js';
import { listCustomers } from '../api/customers.js';
import { previewAttendance, createAttendance } from '../api/attendance.js';

/** Local yyyy-mm-ddTHH:MM for a datetime-local input. */
function toDateTimeInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function RecordAttendance() {
  const [classes, setClasses] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [classId, setClassId] = useState('');
  // UC6 step 4: the form opens with the current date and time.
  const [heldAt, setHeldAt] = useState(() => toDateTimeInput(new Date()));
  const [selected, setSelected] = useState([]); // customer IDs, in tick order
  const [search, setSearch] = useState('');

  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmation, setConfirmation] = useState(null); // the step 8 prompt
  const [result, setResult] = useState(null);

  // The class list and the customer list are both needed up front.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [classData, customerData] = await Promise.all([
          listClasses(),
          listCustomers(),
        ]);
        if (!ignore) {
          setClasses(classData.classes);
          setCustomers(customerData.customers);
        }
      } catch (caught) {
        if (!ignore) setSubmitError(caught.message);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * UC6 steps 5 and 8, asked of the server whenever the sheet changes.
   *
   * The preview is what tells the instructor that Tuesday's sheet is being
   * filed against a Monday class, and who is about to go into the negative.
   */
  useEffect(() => {
    if (!classId || selected.length === 0) {
      setPreview(null);
      return undefined;
    }

    let ignore = false;

    async function run() {
      try {
        const answer = await previewAttendance({
          classId,
          heldAt: new Date(heldAt).toISOString(),
          customerIds: selected,
        });
        if (!ignore) setPreview(answer);
      } catch {
        // The save repeats every check, so a failed preview is not a reason
        // to stop the instructor working.
        if (!ignore) setPreview(null);
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [classId, heldAt, selected]);

  /** Tick or untick one customer (UC6 step 6). */
  function toggleCustomer(customerId) {
    setConfirmation(null);
    setSelected((previous) =>
      previous.includes(customerId)
        ? previous.filter((id) => id !== customerId)
        : [...previous, customerId]
    );
  }

  /**
   * Save the sheet.
   *
   * @param {boolean} allowNegativeBalance - true on the second attempt, after
   *        the instructor has answered the step 8 prompt
   */
  async function save(allowNegativeBalance) {
    setSaving(true);
    setSubmitError(null);

    try {
      const response = await createAttendance({
        classId,
        heldAt: new Date(heldAt).toISOString(),
        customerIds: selected,
        allowNegativeBalance,
      });

      setResult(response);
      setConfirmation(null);
      setSelected([]);
      setPreview(null);
    } catch (error) {
      // 409 with requiresConfirmation is step 8: not a rejection, a question.
      if (error.requiresConfirmation) {
        setConfirmation({
          message: error.message,
          insufficient: error.body?.insufficient || [],
        });
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setResult(null);
    setSubmitError(null);

    if (!classId) {
      setSubmitError('Please choose a class.');
      return;
    }
    if (selected.length === 0) {
      setSubmitError('Add at least one customer to the attendance sheet.');
      return;
    }

    save(false);
  }

  // The customer picker's filter. Matching on name or ID means an instructor
  // can type either, which is what a studio front desk actually does.
  const term = search.trim().toLowerCase();
  const visibleCustomers = term
    ? customers.filter(
        (customer) =>
          customer.fullName.toLowerCase().includes(term) ||
          customer.customerId.toLowerCase().includes(term)
      )
    : customers;

  const chosenClass = classes.find((item) => item.classId === classId);

  return (
    <>
      <div className="page-header">
        <h1>Record class attendance</h1>
        <p>
          Use case 6. Choose the class, check the date and time, and tick off
          everyone who attended. YogiTrack takes a class off each
          customer&apos;s balance and sends them a check-in confirmation.
        </p>
      </div>

      {result && (
        <Alert variant="success" title="Attendance saved">
          <p>{result.message}</p>

          {/* UC6 step 10: what each attendee was sent, and their new
              balance. The messages are logged rather than delivered. */}
          <div className="message-preview">
            <span className="message-preview__channel">Check-in confirmations</span>
            {result.notifications.map((notification) => (
              <p key={notification.customerId}>
                <strong>{notification.channel}</strong> to {notification.address}:{' '}
                {notification.text}
              </p>
            ))}
          </div>

          <div className="alert__actions">
            <Link className="btn btn--secondary" to="/attendance">
              View attendance sheets
            </Link>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not save">
          <p>{submitError}</p>
        </Alert>
      )}

      {/* UC6 step 5. A warning, because a class can legitimately be moved. */}
      {preview?.scheduleWarning && (
        <Alert variant="warning" title="Date does not match the schedule">
          <p>{preview.scheduleWarning}</p>
        </Alert>
      )}

      {/* UC6 step 8. The server has refused once and is asking. */}
      {confirmation && (
        <Alert variant="warning" title="Not enough classes left">
          <p>{confirmation.message}</p>
          <ul>
            {confirmation.insufficient.map((entry) => (
              <li key={entry.customerId}>
                {entry.fullName} ({entry.customerId}): balance{' '}
                {entry.balanceBefore} would become {entry.balanceAfter}.
              </li>
            ))}
          </ul>
          <p>
            Saving anyway records the negative balance, to be settled with the
            customer later.
          </p>
          <div className="alert__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => save(true)}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Check them in anyway'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setConfirmation(null)}
              disabled={saving}
            >
              Go back
            </button>
          </div>
        </Alert>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="form__section">
            <legend className="form__section-title">Class</legend>
            <div className="form__grid">
              <div className="field">
                <label className="field__label" htmlFor="field-classId">
                  Class
                  <span className="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-classId"
                  name="classId"
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setConfirmation(null);
                  }}
                  className="field__input"
                >
                  <option value="">Choose a class…</option>
                  {classes.map((item) => (
                    <option key={item.classId} value={item.classId}>
                      {item.classId} — {item.day} {item.time}, {item.classType}
                    </option>
                  ))}
                </select>
                <span className="field__hint">
                  {classes.length === 0
                    ? 'No classes are scheduled yet.'
                    : 'The classes you lead'}
                </span>
              </div>

              <FormField
                name="heldAt"
                label="Date and time held"
                type="datetime-local"
                value={heldAt}
                onChange={(event) => {
                  setHeldAt(event.target.value);
                  setConfirmation(null);
                }}
                hint={
                  chosenClass
                    ? `Scheduled for ${chosenClass.day} at ${chosenClass.time}`
                    : 'Defaults to now'
                }
                required
              />
            </div>
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">
              Who attended ({selected.length} checked in)
            </legend>

            <FormField
              name="search"
              label="Find a customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              hint="Search by name or customer ID"
              fullWidth
            />

            <div className="checklist">
              {visibleCustomers.length === 0 && (
                <p className="field__hint">No customers match that search.</p>
              )}

              {visibleCustomers.map((customer) => {
                // What the preview says this person's check-in will do.
                const assessment = preview?.attendees.find(
                  (entry) => entry.customerId === customer.customerId
                );

                return (
                  <label
                    key={customer.customerId}
                    className={`checklist__item${
                      selected.includes(customer.customerId)
                        ? ' checklist__item--checked'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(customer.customerId)}
                      onChange={() => toggleCustomer(customer.customerId)}
                    />
                    <span className="checklist__name">
                      {customer.fullName}
                      <span className="field__hint"> {customer.customerId}</span>
                    </span>

                    <span className="checklist__balance">
                      {assessment ? (
                        <>
                          {assessment.usedUnlimited ? (
                            <span className="badge">unlimited</span>
                          ) : (
                            <span
                              className={
                                assessment.balanceAfter < 0
                                  ? 'table__balance--negative'
                                  : undefined
                              }
                            >
                              {assessment.balanceBefore} → {assessment.balanceAfter}
                            </span>
                          )}
                          {assessment.warning && (
                            <span className="field__error"> {assessment.warning}</span>
                          )}
                        </>
                      ) : (
                        <span className="field__hint">
                          balance {customer.classBalance}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setSelected([]);
                setSearch('');
                setPreview(null);
                setConfirmation(null);
                setSubmitError(null);
              }}
              disabled={saving}
            >
              Clear the sheet
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
