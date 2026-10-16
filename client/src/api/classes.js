/**
 * client/src/api/classes.js
 * -------------------------
 * The class endpoints, one function per endpoint (UC2).
 */

import { request } from './client.js';

/**
 * Ask whether a slot is free (UC2 steps 2-3). Called as the form is filled in,
 * before anything is saved, the same shape as the duplicate-name check in UC1.
 *
 * @param {{day: string, time: string, durationMinutes: number}} slot
 * @returns {Promise<{conflict: boolean, clashesWith: Array, suggestions: Array}>}
 */
export function checkClassConflict({ day, time, durationMinutes }) {
  // encodeURIComponent escapes anything that would otherwise change the
  // meaning of the query string. "09:00" contains a colon, which is legal in
  // a query value but only once it is encoded.
  const query = new URLSearchParams({
    day,
    time,
    durationMinutes: String(durationMinutes),
  });

  return request(`/api/classes/check-conflict?${query}`);
}

/**
 * Add a class (UC2).
 * @param {object} data - instructorId, day, time, durationMinutes, classType, payRate
 */
export function createClass(data) {
  return request('/api/classes', { method: 'POST', body: data });
}

/**
 * The schedule. A manager gets every class; an instructor gets their own,
 * which the server decides from the signed-in user.
 */
export function listClasses() {
  return request('/api/classes');
}
