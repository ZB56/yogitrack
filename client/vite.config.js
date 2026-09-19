/**
 * client/vite.config.js
 * ---------------------
 * Build and dev-server configuration for the React application.
 *
 * Vite is the tool that serves the app during development and compiles it for
 * production. (Create React App, which older MERN tutorials use, is no longer
 * maintained.) Java analogy: this is the Maven/Gradle build file for the
 * frontend.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    /**
     * In development the React app and the Express API run as two separate
     * processes on two different ports. A browser treats those as different
     * origins and blocks the request.
     *
     * This proxy makes the dev server forward anything starting with /api to
     * Express, so the browser only ever talks to port 5173 and the frontend
     * code can call "/api/instructors" with no host name in it. That same
     * relative URL then works unchanged in production, where Express serves
     * the built files and the API from one origin.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },

  build: {
    // server.js serves client/dist in production, so the two must agree.
    outDir: 'dist',
  },
});
