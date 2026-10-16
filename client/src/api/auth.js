/**
 * client/src/api/auth.js
 * ----------------------
 * The authentication endpoints, one function per endpoint.
 * Mirrors server/routes/authRoutes.js.
 */

import { request } from './client.js';

/**
 * Sign in.
 * @param {{username: string, password: string}} credentials
 * @returns {Promise<{token: string, user: object}>}
 */
export function login(credentials) {
  return request('/api/auth/login', { method: 'POST', body: credentials });
}

/**
 * Who is this token for? Called on page load to find out whether the token in
 * storage is still valid, since the browser cannot tell on its own.
 * @returns {Promise<{user: object}>}
 */
export function fetchCurrentUser() {
  return request('/api/auth/me');
}

/**
 * Create an account (manager only).
 * @param {{username: string, password: string, role: string, instructorId?: string}} data
 */
export function createUser(data) {
  return request('/api/auth/users', { method: 'POST', body: data });
}

/** Every account on file (manager only). */
export function listUsers() {
  return request('/api/auth/users');
}
