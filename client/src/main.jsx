/**
 * client/src/main.jsx
 * -------------------
 * Entry point for the React application: the bridge from the HTML page to
 * React. Java analogy: the frontend's `public static void main`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// index.html contains a single empty <div id="root">. React takes over that
// element and renders the whole application inside it.
createRoot(document.getElementById('root')).render(
  // StrictMode is a development-only check. It deliberately runs components
  // twice to surface side effects that do not belong in a render. It is
  // stripped out of the production build, so it costs nothing at deploy time.
  <StrictMode>
    <App />
  </StrictMode>
);
