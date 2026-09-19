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

const router = express.Router();

router.route('/').get(listPackages).post(createPackage);

router.get('/:packageId', getPackage);

export default router;
