/**
 * client/src/api/attendance.js
 * ----------------------------
 * The attendance endpoints, one function per endpoint (UC6).
 */

import { request } from './client.js';

/**
 * Work out what the sheet would do without saving it: what each check-in
 * costs, who has run out (UC6 step 8), and whether the date and time match
 * the class schedule (step 5).
 *
 * @param {{classId: string, heldAt: string, customerIds: string[]}} sheet
 */
export function previewAttendance(sheet) {
  return request('/api/attendance/preview', { method: 'POST', body: sheet });
}

/**
 * Save the sheet (UC6 steps 7-10).
 *
 * Pass allowNegativeBalance: true to go ahead after the server has warned
 * that someone has no classes left.
 *
 * @param {object} sheet - classId, heldAt, customerIds, allowNegativeBalance
 */
export function createAttendance(sheet) {
  return request('/api/attendance', { method: 'POST', body: sheet });
}

/**
 * Sheets, newest first. An instructor gets their own, which the server
 * decides from the signed-in user.
 * @param {{classId?: string}} [filter]
 */
export function listAttendance(filter = {}) {
  const query = filter.classId
    ? `?${new URLSearchParams({ classId: filter.classId })}`
    : '';
  return request(`/api/attendance${query}`);
}
