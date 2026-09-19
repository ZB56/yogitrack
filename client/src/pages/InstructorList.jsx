/**
 * client/src/pages/InstructorList.jsx
 * -----------------------------------
 * Every instructor on file, newest first.
 *
 * Not part of the written UC1, which only describes adding. Design decision #9
 * in docs/07-design-decisions.md: read views are built in Part 1 so saved
 * records are actually visible, with modify and delete following in Part 2.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listInstructors } from '../api/instructors.js';

export default function InstructorList() {
  const [instructors, setInstructors] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  /**
   * useEffect runs code that reaches outside React — here, a network call.
   * The component function itself must stay free of side effects, because
   * React may call it more than once per visible update.
   *
   * The `[]` second argument is the dependency list: empty means "run once,
   * after the first render". Leaving it out entirely would run the effect
   * after EVERY render, and since the fetch sets state, that would be an
   * infinite loop. This is the single most common React mistake.
   */
  useEffect(() => {
    // `ignore` guards against a slow response arriving after the user has
    // already navigated away: without it React warns about setting state on
    // a component that is no longer on screen.
    let ignore = false;

    async function load() {
      try {
        const data = await listInstructors();
        if (!ignore) {
          setInstructors(data.instructors);
          setStatus('ready');
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught.message);
          setStatus('error');
        }
      }
    }

    load();

    // The returned function is the cleanup, run when the component unmounts.
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Instructors</h1>
        <p>
          {status === 'ready'
            ? `${instructors.length} instructor${instructors.length === 1 ? '' : 's'} on file.`
            : 'Everyone currently teaching at the studio.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading instructors…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load instructors">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && instructors.length === 0 && (
        <div className="empty-state">
          <p>No instructors have been added yet.</p>
          <Link className="btn btn--primary" to="/instructors/new">
            Add the first instructor
          </Link>
        </div>
      )}

      {status === 'ready' && instructors.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            {/* A caption names the table for a screen reader. It is hidden
                visually here only because the page heading already says it. */}
            <caption className="visually-hidden">Instructors</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Prefers</th>
              </tr>
            </thead>
            <tbody>
              {/* .map turns the array of instructors into an array of rows.
                  React needs a stable `key` on each one to tell the rows
                  apart between renders; the array index is a poor key because
                  it changes when the list is re-sorted. */}
              {instructors.map((instructor) => (
                <tr key={instructor.instructorId}>
                  <td className="table__id">{instructor.instructorId}</td>
                  <td>{instructor.fullName}</td>
                  <td>{instructor.phone}</td>
                  <td>{instructor.email}</td>
                  <td>
                    <span className="badge">{instructor.preferredContact}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
