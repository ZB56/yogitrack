/**
 * client/src/auth/AuthContext.jsx
 * -------------------------------
 * Who is signed in, available to every component without passing it down.
 *
 * The problem this solves: the header needs the user's name, the navigation
 * needs their role, the login page needs to sign them in, and the route guard
 * needs to know whether anyone is signed in at all. Threading that through
 * every component as props ("prop drilling") would mean components that do not
 * care about the user still having to accept and forward it.
 *
 * React's Context is the answer: a provider holds the value once, high up in
 * the tree, and any component below it reads the value directly.
 *
 * Java analogy: a single application-scoped bean the whole app can inject,
 * rather than constructor-passing it through every layer.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as loginRequest, fetchCurrentUser } from '../api/auth.js';
import { setToken, clearToken, getToken } from '../api/session.js';
import { setUnauthorizedHandler } from '../api/client.js';

// The context object itself. The default value is only used by a component
// with no provider above it, which would be a bug, so it is left minimal.
const AuthContext = createContext(null);

/**
 * Wraps the application and supplies the auth state.
 *
 * `status` matters more than it looks: on the very first render the app has a
 * token in storage but does not yet know whether it is still valid. Without a
 * third "checking" state, the app would show the login screen for a moment on
 * every refresh and then flip to the real page — a visible flicker that makes
 * a working app look broken.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('checking'); // checking | ready

  /**
   * Verify the stored token with the server, once, on first mount.
   *
   * The token's signature cannot be checked in the browser (the secret is on
   * the server), and its payload could have been edited by hand, so the only
   * trustworthy answer comes from asking.
   */
  useEffect(() => {
    let ignore = false; // guards against the answer arriving after unmount

    async function restoreSession() {
      if (!getToken()) {
        // Nothing stored: no need to ask the server anything.
        if (!ignore) setStatus('ready');
        return;
      }

      try {
        const { user: currentUser } = await fetchCurrentUser();
        if (!ignore) setUser(currentUser);
      } catch {
        // An expired or tampered token. api/client.js has already cleared it.
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setStatus('ready');
      }
    }

    restoreSession();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Let api/client.js push the app back to signed-out when any request
   * answers 401, e.g. a token that expires while a form is open.
   *
   * useCallback keeps the same function identity between renders, so this
   * effect does not re-register a new handler after every state change.
   */
  const handleUnauthorized = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null); // tidy up on unmount
  }, [handleUnauthorized]);

  /**
   * Sign in. Throws on failure so the login form can show the message;
   * swallowing the error here would leave the form with nothing to display.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} the signed-in user
   */
  async function signIn(username, password) {
    const response = await loginRequest({ username, password });

    // Order matters: store the token first, so any request fired by the page
    // that renders next already carries it.
    setToken(response.token);
    setUser(response.user);

    return response.user;
  }

  /** Sign out: forget the token and the user. */
  function signOut() {
    clearToken();
    setUser(null);
  }

  const value = {
    user,
    status,
    signIn,
    signOut,
    // Small conveniences so components do not repeat the string comparison.
    isManager: user?.role === 'manager',
    isInstructor: user?.role === 'instructor',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read the auth state from any component below the provider.
 *
 * A custom hook rather than exporting the context directly: it fails with a
 * useful message when a component is rendered outside the provider, instead
 * of handing back null and crashing somewhere further on.
 *
 * @returns {{user: object|null, status: string, signIn: Function, signOut: Function, isManager: boolean, isInstructor: boolean}}
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
}
