/**
 * server/routes/reportRoutes.js
 * -----------------------------
 * Maps the four UC7 reports to their handlers.
 * Mounted by server.js at /api/reports, behind requireAuth.
 *
 * Manager only. Three of the four reports are the studio's commercial
 * position (revenue, what each teacher is owed, who owes the studio
 * classes), which is not an instructor's to read.
 */

import express from 'express';
import {
  packageSalesReport,
  instructorReport,
  customerReport,
  teacherPaymentReport,
} from '../controllers/reportController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireRole('manager'));

router.get('/package-sales', packageSalesReport);
router.get('/instructors', instructorReport);
router.get('/customers', customerReport);
router.get('/teacher-payments', teacherPaymentReport);

export default router;
