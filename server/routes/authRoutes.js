/**
 * server/routes/authRoutes.js
 * ---------------------------
 * Maps the authentication URLs to their handlers (Part 2, decision 12).
 * Mounted by server.js at /api/auth.
 *
 * This is the one router with a public route on it. Everything else in the
 * application sits behind requireAuth, which is why the middleware is listed
 * here per route rather than applied to the whole router: /login has to be
 * reachable by someone who is, by definition, not signed in yet.
 */

import express from 'express';
import {
  login,
  getCurrentUser,
  createUser,
  listUsers,
} from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login — public, by necessity.
router.post('/login', login);

// GET /api/auth/me — any signed-in user. The React app calls this on load to
// check whether the token it found in storage is still good.
router.get('/me', requireAuth, getCurrentUser);

/**
 * GET  /api/auth/users — list accounts
 * POST /api/auth/users — create one
 *
 * Both manager only. The middleware runs left to right: requireAuth
 * establishes who is asking, then requireRole decides whether they may.
 */
router
  .route('/users')
  .get(requireAuth, requireRole('manager'), listUsers)
  .post(requireAuth, requireRole('manager'), createUser);

export default router;
