/**
 * server/server.js
 * ----------------
 * Entry point for the YogiTrack backend.
 *
 * Responsibilities, in order:
 *   1. Load configuration from .env into process.env
 *   2. Build the Express application and its middleware chain
 *   3. Mount the /api routes
 *   4. In production, serve the compiled React app
 *   5. Connect to MongoDB, then start listening
 *
 * Java analogy: this is `public static void main` plus the servlet container
 * configuration that in Spring Boot would be spread across @SpringBootApplication
 * and a web config class.
 */

import 'dotenv/config'; // must run before anything reads process.env
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import { connectToDatabase } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import classRoutes from './routes/classRoutes.js';
import saleRoutes from './routes/saleRoutes.js';

// ES modules have no built-in __dirname (CommonJS did). This recreates it from
// the module's own URL so paths below are relative to this file, not to the
// directory the process happened to be started from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

/* ---------------------------------------------------------------------------
 * Middleware
 *
 * Middleware functions run in the order they are registered, each one getting
 * a chance to read or change the request before the route handler sees it.
 * Java analogy: a servlet filter chain.
 * ------------------------------------------------------------------------- */

// In development the React dev server runs on a different port (5173) than
// Express (5001). Browsers block cross-port requests unless the server opts in,
// which is what CORS does. In production both are served from the same origin,
// so this has no effect there.
app.use(cors());

// Parses a JSON request body into a JavaScript object on `req.body`.
// Without this, req.body is undefined and every form POST looks empty.
app.use(express.json());

/* ---------------------------------------------------------------------------
 * API routes
 *
 * Every backend URL lives under /api so it can never collide with a React page
 * route. Resource routers are mounted here as each use case is built.
 * ------------------------------------------------------------------------- */

// Health check: confirms the server is up. Useful locally and as the endpoint
// a deployment pipeline can ping after a release.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Signing in, and the manager's account management (Part 2, decision 12).
// Mounted WITHOUT requireAuth: /api/auth/login has to be reachable by someone
// who is not signed in yet. The routes inside it apply the middleware
// individually.
app.use('/api/auth', authRoutes);

/**
 * Everything below is behind requireAuth, which rejects a request with no
 * valid token before the router ever sees it. Listing it here, once per
 * resource, makes "this resource needs a signed-in user" visible in one place.
 *
 * WHICH role may do what is decided inside each router, because it varies by
 * endpoint: a manager may add a class, while an instructor may only read the
 * classes they lead.
 */

// UC1 - Add an instructor
app.use('/api/instructors', requireAuth, instructorRoutes);

// UC4 - Add a customer
app.use('/api/customers', requireAuth, customerRoutes);

// UC3 - Add a package
app.use('/api/packages', requireAuth, packageRoutes);

// UC2 - Add a class
app.use('/api/classes', requireAuth, classRoutes);

// UC5 - Record a sale
app.use('/api/sales', requireAuth, saleRoutes);

/* ---------------------------------------------------------------------------
 * Production: serve the compiled React app
 *
 * `npm run build` compiles client/ into client/dist/. In production Express
 * serves those static files, so the API and the UI are one Heroku web process.
 * In development this block is skipped and the Vite dev server serves the UI.
 * ------------------------------------------------------------------------- */
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));

  // React Router handles page routes in the browser, so any request that is
  // not an /api call and not a real file must return index.html and let React
  // decide what to render. Without this, refreshing /instructors returns 404.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Registered last: these only run when no route above matched or an error
// was thrown. Order matters — notFound first, then the error handler.
app.use(notFound);
app.use(errorHandler);

/* ---------------------------------------------------------------------------
 * Startup
 * ------------------------------------------------------------------------- */

// Heroku assigns a port at runtime and passes it in as PORT. Locally it comes
// from .env; the literal 5001 is only a last resort. (5000 is avoided because
// macOS AirPlay Receiver occupies it.)
const PORT = process.env.PORT || 5001;

/**
 * Connect to the database FIRST, then start listening.
 *
 * Doing it in this order means the server never accepts a request it cannot
 * serve. If the database is unreachable the process exits with a clear message
 * rather than returning confusing errors on every request.
 */
async function start() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`YogiTrack server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1); // non-zero exit tells Heroku the boot failed
  }
}

start();

export default app;
