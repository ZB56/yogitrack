/**
 * server/routes/customerRoutes.js
 * -------------------------------
 * Maps customer URLs to controller functions (UC4).
 * Mounted by server.js at /api/customers, so paths here are relative to that.
 */

import express from 'express';
import {
  checkCustomerName,
  createCustomer,
  listCustomers,
  getCustomer,
} from '../controllers/customerController.js';

const router = express.Router();

// ORDER MATTERS: this literal path must be registered before '/:customerId',
// or the parameter route would match first and treat "check-name" as an ID.
router.get('/check-name', checkCustomerName);

router.route('/').get(listCustomers).post(createCustomer);

router.get('/:customerId', getCustomer);

export default router;
