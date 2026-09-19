/**
 * client/src/pages/Home.jsx
 * -------------------------
 * The landing screen: one tile per use case, so the manager can see at a
 * glance everything the application does and go straight to it.
 *
 * Tiles for use cases that are not built yet are shown greyed out rather than
 * hidden. That keeps the scope of the project visible and makes the increment
 * from Part 1 to Part 2 obvious.
 */

import { Link } from 'react-router-dom';

// Data, not markup, so a tile becomes available by flipping `ready` to true.
const USE_CASES = [
  {
    uc: 'UC1',
    title: 'Add an instructor',
    desc: 'Record a new instructor and issue their I##### id.',
    to: '/instructors/new',
    ready: true,
  },
  {
    uc: 'UC4',
    title: 'Add a customer',
    desc: 'Record a new customer and issue their C##### id.',
    to: '/customers/new',
    ready: true,
  },
  {
    uc: 'UC3',
    title: 'Add a package',
    desc: 'Define a class package, its validity and its price.',
    to: '/packages/new',
    ready: true,
  },
  {
    uc: 'UC2',
    title: 'Add a class',
    desc: 'Schedule a class and check for conflicts.',
    to: '/classes/new',
    ready: false,
  },
  {
    uc: 'UC5',
    title: 'Record a sale',
    desc: 'Sell a package to a customer and update their balance.',
    to: '/sales/new',
    ready: false,
  },
  {
    uc: 'UC6',
    title: 'Record attendance',
    desc: 'Check customers in to a class.',
    to: '/attendance/new',
    ready: false,
  },
];

export default function Home() {
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
        {USE_CASES.map((useCase) =>
          useCase.ready ? (
            <Link key={useCase.uc} to={useCase.to} className="tile">
              <div className="tile__uc">{useCase.uc}</div>
              <div className="tile__title">{useCase.title}</div>
              <p className="tile__desc">{useCase.desc}</p>
            </Link>
          ) : (
            // A <div>, not a <Link>: there is nowhere to go yet, and a link
            // that does nothing when clicked is worse than an obvious stub.
            <div key={useCase.uc} className="tile tile--soon">
              <div className="tile__uc">{useCase.uc}</div>
              <div className="tile__title">{useCase.title}</div>
              <p className="tile__desc">{useCase.desc} (Coming soon)</p>
            </div>
          )
        )}
      </div>
    </>
  );
}
