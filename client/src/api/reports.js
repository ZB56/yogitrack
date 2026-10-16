/**
 * client/src/api/reports.js
 * -------------------------
 * The four UC7 reports, one function per endpoint.
 */

import { request } from './client.js';

/** Report 1: what sold, how many, and what it brought in. */
export function packageSalesReport() {
  return request('/api/reports/package-sales');
}

/** Report 2: instructors with their classes and their check-ins. */
export function instructorReport() {
  return request('/api/reports/instructors');
}

/** Report 3: customers with their packages, active, future or expired. */
export function customerReport() {
  return request('/api/reports/customers');
}

/**
 * Report 4: what each instructor is owed for a month.
 * @param {string} [month] - 'YYYY-MM'; defaults to the current month
 */
export function teacherPaymentReport(month) {
  const query = month ? `?${new URLSearchParams({ month })}` : '';
  return request(`/api/reports/teacher-payments${query}`);
}
