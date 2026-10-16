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

import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
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
  { to: '/accounts', label: 'Accounts', roles: ['manager'] },
];

// Paths that are a prefix of another nav path need `end`, or /instructors
// would also highlight while /instructors/new is open.
const EXACT_MATCH_PATHS = ['/instructors', '/customers', '/packages', '/classes'];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

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
          <Link to="/" className="brand">
            <span className="brand__name">YogiTrack</span>
            <span className="brand__tag">Yoga H&apos;om studio records</span>
          </Link>

          {/* <nav> rather than <div>: it tells a screen reader that this is
              the site navigation, and the aria-label names it. */}
          <nav className="nav" aria-label="Main">
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
