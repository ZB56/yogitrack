/**
 * server/routes/classRoutes.js
 * ----------------------------
 * Maps class URLs to controller functions (UC2).
 * Mounted by server.js at /api/classes, behind requireAuth.
 */

import express from 'express';
import {
  checkClassConflict,
  createClass,
  listClasses,
  getClass,
} from '../controllers/classController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/classes/check-conflict?day=Tuesday&time=09:00  (UC2 steps 2-3)
//
// ORDER MATTERS: registered before '/:classId', or the parameter route would
// match first and treat "check-conflict" as a class ID.
router.get('/check-conflict', requireRole('manager'), checkClassConflict);

/**
 * GET  /api/classes   the schedule
 * POST /api/classes   add a class (UC2)
 *
 * Reading is open to instructors as well: UC6 step 2 shows an instructor the
 * classes they lead, and the controller narrows the list to their own from
 * the signed-in user rather than from anything the caller sends.
 * Only a manager may add one, as UC2's actor is the Manager.
 */
router
  .route('/')
  .get(requireRole('manager', 'instructor'), listClasses)
  .post(requireRole('manager'), createClass);

// GET /api/classes/L00001
router.get('/:classId', requireRole('manager', 'instructor'), getClass);

export default router;
