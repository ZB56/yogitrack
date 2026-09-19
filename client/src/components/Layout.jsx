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
 */

import { NavLink, Link, Outlet } from 'react-router-dom';

// The navigation entries, in the order the use cases build on each other.
// Held as data rather than repeated markup, so adding a screen is one line.
const NAV_ITEMS = [
  { to: '/instructors/new', label: 'Add Instructor' },
  { to: '/instructors', label: 'Instructors' },
  { to: '/customers/new', label: 'Add Customer' },
  { to: '/customers', label: 'Customers' },
  { to: '/packages/new', label: 'Add Package' },
  { to: '/packages', label: 'Packages' },
];

export default function Layout() {
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
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                // NavLink calls className with whether this link matches the
                // current URL, which is how the active tab is highlighted.
                // `end` stops /instructors matching /instructors/new too.
                end={['/instructors', '/customers', '/packages'].includes(item.to)}
                className={({ isActive }) =>
                  isActive ? 'nav__link nav__link--active' : 'nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
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
