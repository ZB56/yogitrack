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
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// ORDER MATTERS: this literal path must be registered before '/:customerId',
// or the parameter route would match first and treat "check-name" as an ID.
router.get('/check-name', requireRole('manager'), checkCustomerName);

/**
 * Reading the customer list is allowed for an instructor as well as a
 * manager: UC6 step 6 has the instructor "choose the names of customers from
 * the list of customers", so the attendance screen cannot work without it.
 *
 * Creating a customer stays manager-only — UC4's actor is the Manager.
 */
router
  .route('/')
  .get(requireRole('manager', 'instructor'), listCustomers)
  .post(requireRole('manager'), createCustomer);

router.get('/:customerId', requireRole('manager', 'instructor'), getCustomer);

export default router;
