/**
 * client/src/auth/RequireAuth.jsx
 * -------------------------------
 * The route guard: wraps the pages that need a signed-in user, and optionally
 * a particular role.
 *
 * To be clear about what this is and is not: this decides what the UI SHOWS.
 * It is not a security boundary — the page's JavaScript is already in the
 * browser, and anyone can call the API with curl. The real enforcement is
 * server/middleware/auth.js, which checks the token and the role on every
 * request. This guard exists so a manager-only screen is not offered to an
 * instructor who would only get a 403 from it.
 *
 * Used in App.jsx as a wrapper route, so one element protects a whole group
 * of pages rather than each page checking for itself.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * @param {object} props
 * @param {Array<'manager'|'instructor'>} [props.roles] - allowed roles;
 *        omitted means any signed-in user
 */
export default function RequireAuth({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  // The provider is still asking the server whether the stored token is good.
  // Rendering nothing conclusive yet avoids a flash of the login screen on
  // every page refresh.
  if (status === 'checking') {
    return <p className="spinner-text">Checking your session…</p>;
  }

  if (!user) {
    /**
     * Send them to the login screen, remembering where they were headed, so
     * that after signing in they land on the page they actually wanted
     * instead of the home page.
     *
     * `replace` keeps the protected URL out of the back history, so the back
     * button after signing in does not bounce through the login screen.
     */
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    // Signed in, but this screen is not theirs. Home is a screen every role
    // can see, and its tiles are already filtered by role.
    return <Navigate to="/" replace />;
  }

  // <Outlet> renders whichever child route matched. Same mechanism Layout
  // uses: the guard is a wrapper, not a replacement for the page.
  return <Outlet />;
}
