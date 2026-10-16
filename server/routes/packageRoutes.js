/**
 * server/routes/packageRoutes.js
 * ------------------------------
 * Maps package URLs to controller functions (UC3).
 * Mounted by server.js at /api/packages.
 */

import express from 'express';
import {
  createPackage,
  listPackages,
  getPackage,
} from '../controllers/packageController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// UC3's actor is the Manager, and so is UC5's (recording a sale), which is
// the only other use case that reads packages. Manager-only throughout.
router.use(requireRole('manager'));

router.route('/').get(listPackages).post(createPackage);

router.get('/:packageId', getPackage);

export default router;
