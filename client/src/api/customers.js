/**
 * client/src/api/customers.js
 * ---------------------------
 * The customer endpoints, one function per endpoint (UC4).
 * Mirrors api/instructors.js, because UC1 and UC4 have the same shape.
 */

import { request } from './client.js';

/**
 * Check whether a customer with this name already exists (UC4 step 2).
 * @returns {Promise<{exists: boolean, count: number, matches: object[]}>}
 */
export function checkCustomerName(firstName, lastName) {
  const query = new URLSearchParams({ firstName, lastName });
  return request(`/api/customers/check-name?${query}`);
}

/**
 * Create a customer (UC4 steps 3-7).
 * @throws {ApiError} with requiresConfirmation=true on an unconfirmed duplicate
 */
export function createCustomer(data) {
  return request('/api/customers', { method: 'POST', body: data });
}

/**
 * Fetch every customer, newest first.
 */
export function listCustomers() {
  return request('/api/customers');
}
