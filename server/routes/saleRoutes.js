/**
 * server/routes/saleRoutes.js
 * ---------------------------
 * Maps sale URLs to controller functions (UC5).
 * Mounted by server.js at /api/sales, behind requireAuth.
 *
 * UC5's actor is the Manager throughout: an instructor neither records
 * payments nor reads the studio's takings.
 */

import express from 'express';
import { quoteSale, createSale, listSales } from '../controllers/saleController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireRole('manager'));

// GET /api/sales/quote?customerId=C00001&packageId=P00003  (UC5 step 2)
//
// Registered before any parameter route, for the usual reason: a literal
// path has to be matched before a wildcard that would swallow it.
router.get('/quote', quoteSale);

// GET  /api/sales   every sale, or one customer's with ?customerId=
// POST /api/sales   record a sale (UC5)
router.route('/').get(listSales).post(createSale);

export default router;
