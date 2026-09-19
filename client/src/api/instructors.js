/**
 * client/src/api/instructors.js
 * -----------------------------
 * The instructor endpoints, one function per endpoint (UC1).
 *
 * Components import these by name, so a component never contains a URL string.
 * If a route changes on the server, it changes here and nowhere else.
 */

import { request } from './client.js';

/**
 * Check whether an instructor with this name already exists (UC1 step 2).
 * Called before saving, so the UI can prompt rather than silently duplicate.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {Promise<{exists: boolean, count: number, matches: object[]}>}
 */
export function checkInstructorName(firstName, lastName) {
  // URLSearchParams escapes characters like & and spaces correctly. Building
  // the query string by concatenation would break on a name like "O'Brien".
  const query = new URLSearchParams({ firstName, lastName });
  return request(`/api/instructors/check-name?${query}`);
}

/**
 * Create an instructor (UC1 steps 3-7).
 *
 * @param {object} data - the form values
 * @param {boolean} [data.confirmDuplicate] - true once the manager has
 *   acknowledged that someone with this name already exists
 * @returns {Promise<{message: string, instructor: object, notification: object}>}
 * @throws {ApiError} with requiresConfirmation=true if a duplicate name exists
 *   and confirmDuplicate was not set
 */
export function createInstructor(data) {
  return request('/api/instructors', { method: 'POST', body: data });
}

/**
 * Fetch every instructor, newest first.
 * @returns {Promise<{count: number, instructors: object[]}>}
 */
export function listInstructors() {
  return request('/api/instructors');
}
