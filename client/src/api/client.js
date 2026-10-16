/**
 * client/src/api/client.js
 * ------------------------
 * The one place the frontend talks to the backend over HTTP.
 *
 * Every component calls a function from src/api/ instead of calling fetch()
 * itself. That keeps URL building, JSON parsing and error handling in a single
 * file, so a change to any of them happens once.
 *
 * Java analogy: a small HTTP client wrapper you would write once and inject
 * everywhere, rather than opening a connection inline in each class.
 */

import { getToken, clearToken } from './session.js';

/**
 * Called when the server rejects the token (401). The AuthProvider registers
 * itself here on mount, so a session that expires mid-use sends the user to
 * the login screen immediately rather than showing an error on every page.
 *
 * A callback rather than an import of the provider: api/ must not depend on a
 * React component, or the dependency runs in a circle.
 */
let onUnauthorized = null;

/** @param {Function} handler - called with no arguments on any 401 */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/**
 * An error carrying the structured detail the Express API sends back.
 *
 * `fetch` only rejects on a network failure. A 400 or 409 response is a
 * perfectly successful HTTP round trip as far as fetch is concerned, so the
 * status has to be checked by hand and turned into an error like this one.
 *
 * Java analogy: extending Exception to add fields to it.
 */
export class ApiError extends Error {
  constructor(message, { status, fields, requiresConfirmation, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;                           // HTTP status code
    this.fields = fields || null;                   // { fieldName: message }
    this.requiresConfirmation = Boolean(requiresConfirmation); // duplicate-name prompt
    this.body = body;
  }
}

/**
 * Make a request to the API and return the parsed JSON body.
 *
 * @param {string} path - an API path such as '/api/instructors'
 * @param {object} [options] - fetch options; `body` may be a plain object
 * @returns {Promise<object>} the parsed response body
 * @throws {ApiError} when the server responds with a non-2xx status
 */
export async function request(path, options = {}) {
  const { body, ...rest } = options;

  // The path is relative ('/api/...') with no host name. In development Vite
  // proxies it to Express on port 5001; in production Express serves both the
  // UI and the API from the same origin. The same string works in both.
  // The sign-in token, when there is one. "Bearer" is the standard scheme for
  // "whoever holds this token is the user"; server/middleware/auth.js reads
  // the other end of it. Attaching it here means no page has to remember to.
  const token = getToken();

  const response = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    // fetch needs a JSON string, not an object, so objects are serialised here
    // and every caller can just pass a plain object.
    body: body ? JSON.stringify(body) : undefined,
  });

  // A 500 from a crashed process can be HTML rather than JSON, so guard the
  // parse instead of letting it throw an unhelpful "Unexpected token <".
  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  }

  /**
   * 401 means the token is missing, altered or expired. Whatever the page was
   * doing, the only useful next step is to sign in again, so the token is
   * discarded and the provider is told. The error is still thrown, so a page
   * mid-save does not carry on as though it had succeeded.
   *
   * The login request itself is excluded: a wrong password also answers 401,
   * and treating that as an expired session would wipe a token that is still
   * perfectly good and bounce a signed-in manager out of the app.
   */
  if (response.status === 401 && path !== '/api/auth/login') {
    clearToken();
    if (onUnauthorized) onUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status}).`,
      {
        status: response.status,
        fields: payload?.fields,
        requiresConfirmation: payload?.requiresConfirmation,
        body: payload,
      }
    );
  }

  return payload;
}
