/**
 * client/src/api/packages.js
 * --------------------------
 * The package endpoints, one function per endpoint (UC3).
 */

import { request } from './client.js';

/**
 * Create a package (UC3).
 * @param {object} data - name, category, classType, unlimited, numClasses,
 *                        startDate, endDate, price
 * @returns {Promise<{message: string, package: object}>}
 */
export function createPackage(data) {
  return request('/api/packages', { method: 'POST', body: data });
}

/**
 * Fetch every package, newest first.
 */
export function listPackages() {
  return request('/api/packages');
}
