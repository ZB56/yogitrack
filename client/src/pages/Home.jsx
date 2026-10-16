/**
 * client/src/pages/Home.jsx
 * -------------------------
 * The landing screen: one tile per use case, so the user can see at a glance
 * everything the application does and go straight to it.
 *
 * Part 2 made the tiles role-aware. A manager sees the six use cases that are
 * theirs; an instructor sees only recording attendance, which is the one use
 * case the course assigns to that actor. Tiles for other roles are not greyed
 * out but left out entirely — a greyed tile says "not built yet", which would
 * be misleading when the real answer is "not yours".
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Data, not markup, so adding a screen is one entry. `roles` matches the
// route guards in App.jsx and the role checks on the server.
const USE_CASES = [
  {
    uc: 'UC1',
    title: 'Add an instructor',
    desc: 'Record a new instructor and issue their I##### id.',
    to: '/instructors/new',
    roles: ['manager'],
  },
  {
    uc: 'UC4',
    title: 'Add a customer',
    desc: 'Record a new customer and issue their C##### id.',
    to: '/customers/new',
    roles: ['manager'],
  },
  {
    uc: 'UC2',
    title: 'Add a class',
    desc: 'Schedule a weekly class and check the slot is free.',
    to: '/classes/new',
    roles: ['manager'],
  },
  {
    uc: 'UC3',
    title: 'Add a package',
    desc: 'Define a class package, its validity and its price.',
    to: '/packages/new',
    roles: ['manager'],
  },
  {
    uc: 'UC5',
    title: 'Record a sale',
    desc: 'Sell a package and update the customer balance.',
    to: '/sales/new',
    roles: ['manager'],
  },
  {
    uc: 'UC6',
    title: 'Record attendance',
    desc: 'Check customers in to a class and update their balances.',
    to: '/attendance/new',
    roles: ['manager', 'instructor'],
  },
];

export default function Home() {
  const { user } = useAuth();

  const tiles = USE_CASES.filter((useCase) => useCase.roles.includes(user?.role));

  return (
    <>
      <div className="page-header">
        <h1>Yoga H&apos;om studio records</h1>
        <p>
          YogiTrack replaces the studio&apos;s paper cards and attendance
          sheets. Choose a task to begin.
        </p>
      </div>

      <div className="tiles">
        {tiles.map((useCase) => (
          <Link key={useCase.uc} to={useCase.to} className="tile">
            <div className="tile__uc">{useCase.uc}</div>
            <div className="tile__title">{useCase.title}</div>
            <p className="tile__desc">{useCase.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
