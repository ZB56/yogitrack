/**
 * client/src/api/sales.js
 * -----------------------
 * The sale endpoints, one function per endpoint (UC5).
 */

import { request } from './client.js';

/**
 * Ask what a sale of this package to this customer should look like:
 * the price, the validity window, and the customer's current balance.
 * This is what fills the form in for UC5 step 2.
 *
 * @param {{customerId: string, packageId: string}} selection
 */
export function quoteSale({ customerId, packageId }) {
  const query = new URLSearchParams({ customerId, packageId });
  return request(`/api/sales/quote?${query}`);
}

/**
 * Record a sale (UC5).
 * @param {object} data - customerId, packageId, amountPaid, paymentMode,
 *                        paidAt, validFrom, validTo
 */
export function createSale(data) {
  return request('/api/sales', { method: 'POST', body: data });
}

/**
 * Every sale, newest first, or one customer's with { customerId }.
 * @param {{customerId?: string}} [filter]
 */
export function listSales(filter = {}) {
  const query = filter.customerId
    ? `?${new URLSearchParams({ customerId: filter.customerId })}`
    : '';
  return request(`/api/sales${query}`);
}
