/**
 * client/src/components/Layout.jsx
 * --------------------------------
 * The frame every page sits inside: header, navigation, footer.
 *
 * A React component is a function that returns the markup to display. The
 * markup-looking syntax is JSX; Vite compiles it to plain JavaScript function
 * calls before the browser ever sees it.
 *
 * Java analogy: a JSP template or a layout class the individual pages extend.
 *
 * Part 2 made the navigation role-aware. Each entry carries the roles that
 * may use it, and the header shows who is signed in with a way to sign out.
 */

import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * The navigation entries, in the order the use cases build on each other.
 * Held as data rather than repeated markup, so adding a screen is one line.
 *
 * `roles` is the list of roles allowed to see the link. It matches the route
 * guards in App.jsx and the role checks on the server; those two are what
 * actually enforce it, this only decides what is offered.
 */
const NAV_ITEMS = [
  { to: '/instructors/new', label: 'Add Instructor', roles: ['manager'] },
  { to: '/instructors', label: 'Instructors', roles: ['manager'] },
  { to: '/customers/new', label: 'Add Customer', roles: ['manager'] },
  { to: '/customers', label: 'Customers', roles: ['manager'] },
  { to: '/packages/new', label: 'Add Package', roles: ['manager'] },
  { to: '/packages', label: 'Packages', roles: ['manager'] },
  { to: '/classes/new', label: 'Add Class', roles: ['manager'] },
  { to: '/classes', label: 'Schedule', roles: ['manager', 'instructor'] },
  { to: '/sales/new', label: 'Record Sale', roles: ['manager'] },
  { to: '/sales', label: 'Sales', roles: ['manager'] },
  { to: '/attendance/new', label: 'Take Attendance', roles: ['manager', 'instructor'] },
  { to: '/attendance', label: 'Attendance', roles: ['manager', 'instructor'] },
  { to: '/reports', label: 'Reports', roles: ['manager'] },
  { to: '/accounts', label: 'Accounts', roles: ['manager'] },
];

// Paths that are a prefix of another nav path need `end`, or /instructors
// would also highlight while /instructors/new is open.
const EXACT_MATCH_PATHS = [
  '/instructors',
  '/customers',
  '/packages',
  '/classes',
  '/sales',
  '/attendance',
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Whether the menu is open on a narrow screen.
   *
   * Part 2 took the navigation from six entries to eleven, which on a phone
   * filled five rows before any content appeared. Below 900px the links are
   * now behind a Menu button; above it the state is ignored and the links
   * are always shown, which is handled entirely in CSS.
   */
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  // Close the menu whenever the page changes, so following a link on a phone
  // does not leave the list covering what was just opened.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }

  function handleSignOut() {
    signOut();
    // Send them to the login screen explicitly rather than letting the route
    // guard bounce them there, so the destination is not remembered as
    // "where they were" and they are not returned to it on the next sign-in.
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="site-header__bar">
            <Link to="/" className="brand">
              <span className="brand__name">YogiTrack</span>
              <span className="brand__tag">Yoga H&apos;om studio records</span>
            </Link>

            {/* Shown only below 900px (see index.css). aria-expanded tells a
                screen reader whether the list it controls is open, and
                aria-controls says which list that is. */}
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>

          {/* <nav> rather than <div>: it tells a screen reader that this is
              the site navigation, and the aria-label names it. */}
          <nav
            id="main-nav"
            className={`nav${menuOpen ? ' nav--open' : ''}`}
            aria-label="Main"
          >
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                // NavLink calls className with whether this link matches the
                // current URL, which is how the active tab is highlighted.
                // `end` stops /instructors matching /instructors/new too.
                end={EXACT_MATCH_PATHS.includes(item.to)}
                className={({ isActive }) =>
                  isActive ? 'nav__link nav__link--active' : 'nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <div className="session">
              <span className="session__who">
                {user.username}
                <span className="badge badge--muted">{user.role}</span>
              </span>
              <button type="button" className="btn btn--link" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* <Outlet> is where React Router renders whichever page matches the
          current URL. Everything around it stays put as the user navigates. */}
      <main className="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        YogiTrack &middot; ACS 5423 project &middot; Yoga H&apos;om studio
      </footer>
    </div>
  );
}
