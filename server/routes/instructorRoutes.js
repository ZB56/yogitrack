/**
 * server/routes/instructorRoutes.js
 * ---------------------------------
 * Maps instructor URLs to the controller functions that handle them.
 *
 * Kept separate from the controller so this file stays a one-screen table of
 * contents for the resource: every URL the frontend can call, in one place.
 * Java analogy: the @RequestMapping annotations lifted out of the service class.
 */

import express from 'express';
import {
  checkInstructorName,
  createInstructor,
  listInstructors,
  getInstructor,
} from '../controllers/instructorController.js';

// A Router is a mini Express app. server.js mounts it at /api/instructors,
// so the paths below are relative to that prefix.
const router = express.Router();

// GET /api/instructors/check-name?firstName=Ann&lastName=Lee  (UC1 step 2)
//
// ORDER MATTERS: this must come before '/:instructorId'. Express tries routes
// top to bottom and stops at the first match, so if the parameter route came
// first it would swallow "check-name" as an instructor ID.
router.get('/check-name', checkInstructorName);

// GET  /api/instructors     list all instructors
// POST /api/instructors     create one (UC1 steps 4-8)
router.route('/').get(listInstructors).post(createInstructor);

// GET /api/instructors/I00001   one instructor by their readable ID
router.get('/:instructorId', getInstructor);

export default router;
