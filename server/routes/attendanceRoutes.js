/**
 * server/routes/attendanceRoutes.js
 * ---------------------------------
 * Maps attendance URLs to controller functions (UC6).
 * Mounted by server.js at /api/attendance, behind requireAuth.
 *
 * UC6's actor is the Instructor. A manager may also record a sheet, which is
 * how the studio covers for an instructor who could not file their own; the
 * controller is what limits an instructor to the classes they lead.
 */

import express from 'express';
import {
  previewAttendance,
  createAttendance,
  listAttendance,
} from '../controllers/attendanceController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireRole('manager', 'instructor'));

// POST /api/attendance/preview  (UC6 steps 5 and 8, before anything is saved)
//
// A POST rather than a GET because it carries a list of customers, which does
// not belong in a query string. It changes nothing on the server.
router.post('/preview', previewAttendance);

// GET  /api/attendance   sheets, newest first (?classId= to narrow)
// POST /api/attendance   save a sheet (UC6 steps 7-10)
router.route('/').get(listAttendance).post(createAttendance);

export default router;
