/**
 * client/src/api/session.js
 * -------------------------
 * Where the browser keeps the sign-in token.
 *
 * Two parts of the application need it and must not disagree: api/client.js,
 * which attaches it to every request, and the AuthProvider, which decides
 * whether to show the application or the login screen. Keeping it in one tiny
 * module means there is exactly one answer to "am I signed in?".
 *
 * Storage choice, with the trade-off stated honestly: the token goes in
 * localStorage, so a refresh or a new tab does not sign the user out. The
 * safer alternative is an httpOnly cookie, which JavaScript cannot read at
 * all and therefore cannot leak to a cross-site scripting bug — but it brings
 * CSRF protection and cookie configuration with it, and this application has
 * no third-party scripts and no user-generated HTML, which are the usual ways
 * such a bug arrives. The risk is noted in the project report rather than
 * hidden. The short token lifetime (8 hours) limits the damage either way.
 */

const STORAGE_KEY = 'yogitrack.token';

/**
 * Read the stored token.
 *
 * Wrapped in try/catch because localStorage throws rather than returning null
 * in a browser with site data blocked, and a crash on page load would be a
 * blank screen with no explanation.
 *
 * @returns {string|null}
 */
export function getToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the token after a successful sign-in.
 * @param {string} token
 */
export function setToken(token) {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage unavailable: the token still works for this page view, because
    // the AuthProvider holds it in React state too. Only the "stay signed in
    // across a refresh" part is lost.
  }
}

/** Forget the token: sign out, or a token the server has rejected. */
export function clearToken() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage was never available.
  }
}
