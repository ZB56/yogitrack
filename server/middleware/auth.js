/**
 * server/middleware/auth.js
 * -------------------------
 * The two gates every protected route passes through.
 *
 *   requireAuth          — "are you signed in?"
 *   requireRole('manager') — "and are you allowed to do THIS?"
 *
 * They are middleware, so they are listed in front of a route and run before
 * its handler. If the check fails they answer the request themselves and never
 * call next(), so the handler below is never reached.
 *
 * Java analogy: a servlet filter, or Spring Security's
 * @PreAuthorize("hasRole('MANAGER')").
 *
 * The important design point: authorisation is enforced HERE, on the server,
 * not by hiding buttons in React. The UI hides what a role cannot use as a
 * courtesy; these functions are what actually make it impossible. Anyone can
 * send an HTTP request with curl.
 */

import { verifyToken } from '../services/tokens.js';

/**
 * Pull the token out of the Authorization header.
 *
 * The convention is `Authorization: Bearer <token>`. "Bearer" means exactly
 * what it says: whoever bears the token is treated as the user.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function readToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, value] = header.split(' ');

  if (!value || scheme.toLowerCase() !== 'bearer') return null;
  return value.trim();
}

/**
 * Require a valid token. On success, attaches the user to `req.user` so the
 * route handler knows who is asking.
 *
 * Responds 401 Unauthorized when there is no usable token. 401 means "I do
 * not know who you are" — the client reacts by sending the user to the login
 * screen. (403, used below, means "I know who you are and the answer is no".)
 */
export function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Not signed in',
      message: 'Please sign in to continue.',
    });
  }

  try {
    const payload = verifyToken(token);

    // Everything downstream reads req.user rather than decoding the token
    // again. One shape, set in one place.
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      instructorId: payload.instructorId || null,
    };

    return next(); // hand the request on to the next middleware or the route
  } catch (error) {
    // An expired token is the normal case here, not an error worth logging:
    // tokens are meant to expire. The message distinguishes it so the UI can
    // say "your session has expired" rather than "wrong password".
    const expired = error.name === 'TokenExpiredError';

    return res.status(401).json({
      error: expired ? 'Session expired' : 'Invalid session',
      message: expired
        ? 'Your session has expired. Please sign in again.'
        : 'Please sign in to continue.',
    });
  }
}

/**
 * Require one of the listed roles. Must be used after requireAuth, which is
 * what puts req.user there.
 *
 * Called with the roles and RETURNS the middleware function, so the roles can
 * differ per route: `requireRole('manager')`, `requireRole('manager',
 * 'instructor')`. Java analogy: a method that returns a configured Filter
 * instance rather than a filter class per role.
 *
 * @param {...('manager'|'instructor')} allowedRoles
 * @returns {Function} an Express middleware function
 */
export function requireRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    // Defensive: a route that forgot requireAuth would otherwise let everyone
    // through, and a silent security hole is the worst kind of bug.
    if (!req.user) {
      return res.status(401).json({
        error: 'Not signed in',
        message: 'Please sign in to continue.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Not allowed',
        message: `This action is for the ${allowedRoles.join(' or ')} role.`,
      });
    }

    return next();
  };
}
