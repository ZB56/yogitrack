/**
 * client/src/pages/Accounts.jsx
 * -----------------------------
 * Sign-in accounts, and the form to create one. Manager only.
 *
 * Why this screen exists: authentication needs some way for the studio to
 * decide who may sign in. Instructors cannot sign themselves up — the course
 * use cases have no such actor, and a public sign-up form on a studio's
 * records system would be a hole, not a feature. So the manager creates an
 * instructor's login here and tells them the password.
 *
 * The instructor dropdown lists only instructors who do not already have an
 * account, which is the rule the server enforces too (one login per
 * instructor, so "the classes I lead" is never ambiguous).
 */

import { useEffect, useState } from 'react';
import FormField from '../components/FormField.jsx';
import RadioGroup from '../components/RadioGroup.jsx';
import Alert from '../components/Alert.jsx';
import { listUsers, createUser } from '../api/auth.js';
import { listInstructors } from '../api/instructors.js';

const EMPTY_FORM = {
  username: '',
  password: '',
  role: '',
  instructorId: '',
};

/** Matches MIN_PASSWORD_LENGTH in server/controllers/authController.js. */
const MIN_PASSWORD_LENGTH = 8;

/** @param {string|null} isoString @returns {string} */
function formatWhen(isoString) {
  if (!isoString) return 'Never';
  return new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Accounts() {
  const [users, setUsers] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState(null);

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  /**
   * Bumped after an account is created, which re-runs the effect below.
   *
   * A counter rather than calling a load() function from the submit handler
   * directly: it keeps every fetch inside the effect, where the cleanup
   * function can ignore a response that arrives after the screen has gone.
   */
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Load both lists. Promise.all runs the two requests at the same time
   * rather than waiting for the first to finish: they do not depend on each
   * other, so there is no reason to pay for both round trips in sequence.
   */
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [accountData, instructorData] = await Promise.all([
          listUsers(),
          listInstructors(),
        ]);
        if (ignore) return;
        setUsers(accountData.users);
        setInstructors(instructorData.instructors);
        setStatus('ready');
      } catch (caught) {
        if (ignore) return;
        setLoadError(caught.message);
        setStatus('error');
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Instructors with no account yet: the only ones worth offering.
  const linkedIds = new Set(users.map((user) => user.instructorId).filter(Boolean));
  const available = instructors.filter(
    (instructor) => !linkedIds.has(instructor.instructorId)
  );

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

  function validate() {
    const found = {};

    if (!values.username.trim()) found.username = 'Username is required.';
    if (!values.password) {
      found.password = 'Password is required.';
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
      found.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!values.role) found.role = 'Please choose a role.';
    if (values.role === 'instructor' && !values.instructorId) {
      found.instructorId = 'Please choose which instructor this account is for.';
    }

    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setResult(null);
    setSubmitError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await createUser({
        username: values.username,
        password: values.password,
        role: values.role,
        instructorId: values.role === 'instructor' ? values.instructorId : null,
      });

      setResult(response);
      setValues(EMPTY_FORM);
      setErrors({});
      setReloadKey((key) => key + 1); // re-runs the effect above
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields);
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
        <h1>Sign-in accounts</h1>
        <p>
          Who can sign in to YogiTrack. A manager account can use every screen;
          an instructor account can record attendance for their own classes.
        </p>
      </div>

      {result && (
        <Alert variant="success" title="Account created">
          <p>
            {result.message} Give the password to the account holder directly —
            YogiTrack stores only a hashed copy and cannot show it again.
          </p>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not create the account">
          <p>{submitError}</p>
        </Alert>
      )}

      <div className="card">
        <h2 className="card__title">Create an account</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form__grid">
            <FormField
              name="username"
              label="Username"
              value={values.username}
              onChange={handleChange}
              error={errors.username}
              hint="Lower case, at least 3 characters"
              required
              autoCapitalize="none"
            />
            <FormField
              name="password"
              label="Password"
              type="password"
              value={values.password}
              onChange={handleChange}
              error={errors.password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              required
              autoComplete="new-password"
            />
            <RadioGroup
              name="role"
              legend="Role"
              value={values.role}
              onChange={handleChange}
              error={errors.role}
              required
              options={[
                { value: 'manager', label: 'Manager' },
                { value: 'instructor', label: 'Instructor' },
              ]}
            />

            {/* Only relevant to an instructor account, so it appears only
                when that role is chosen rather than sitting there disabled. */}
            {values.role === 'instructor' && (
              <div className="field field--full">
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
                  {available.map((instructor) => (
                    <option key={instructor.instructorId} value={instructor.instructorId}>
                      {instructor.instructorId} — {instructor.fullName}
                    </option>
                  ))}
                </select>
                {errors.instructorId ? (
                  <span className="field__error">{errors.instructorId}</span>
                ) : (
                  <span className="field__hint">
                    {available.length === 0
                      ? 'Every instructor on file already has an account.'
                      : 'Only instructors without an account are listed.'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create account'}
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

      {status === 'loading' && <p className="spinner-text">Loading accounts…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load accounts">
          <p>{loadError}</p>
        </Alert>
      )}

      {status === 'ready' && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Sign-in accounts</caption>
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Role</th>
                <th scope="col">Instructor</th>
                <th scope="col">Last signed in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>
                    <span className="badge">{user.role}</span>
                  </td>
                  <td className="table__id">{user.instructorId || '—'}</td>
                  <td>{formatWhen(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
