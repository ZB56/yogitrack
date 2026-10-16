/**
 * client/src/pages/Login.jsx
 * --------------------------
 * The sign-in screen (Part 2, design decision 12).
 *
 * Deliberately the only page outside the main Layout: there is no navigation
 * to offer someone who is not signed in yet, and a half-usable header would
 * only invite clicks that bounce straight back here.
 *
 * Note what the error handling does NOT do: it never says which of the two
 * fields was wrong. The server answers every failure identically on purpose
 * (see authController.login) and the UI does not invent a distinction.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Alert from '../components/Alert.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  // Where RequireAuth was sending them before it redirected here.
  const destination = location.state?.from || '/';

  // Already signed in: nothing to do on this page. This also covers the back
  // button after a successful sign-in.
  if (status === 'ready' && user) {
    return <Navigate to={destination} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));

    // Clear this field's error as soon as it is edited: a message about what
    // the value used to be is just noise.
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser's own form submission
    setSubmitError(null);

    const validationErrors = {};
    if (!values.username.trim()) validationErrors.username = 'Username is required.';
    if (!values.password) validationErrors.password = 'Password is required.';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSigningIn(true);
    try {
      await signIn(values.username, values.password);
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error.message);
      // Clear the password but keep the username: a typo is far more likely
      // in the password, and retyping a username nobody got wrong is annoying.
      setValues((previous) => ({ ...previous, password: '' }));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="brand__name">YogiTrack</span>
          <span className="brand__tag">Yoga H&apos;om studio records</span>
        </div>

        <h1 className="login__title">Sign in</h1>
        <p className="login__intro">
          Studio managers and instructors sign in here. Accounts are created by
          the studio manager.
        </p>

        {submitError && (
          <Alert variant="error" title="Could not sign in">
            <p>{submitError}</p>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            name="username"
            label="Username"
            value={values.username}
            onChange={handleChange}
            error={errors.username}
            required
            fullWidth
            // Lets a password manager recognise the pair of fields, and stops
            // phones capitalising the first letter of a username.
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
          />

          <FormField
            name="password"
            label="Password"
            type="password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
            required
            fullWidth
            autoComplete="current-password"
          />

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
