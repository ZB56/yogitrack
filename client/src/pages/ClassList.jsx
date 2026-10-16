/**
 * client/src/pages/ClassList.jsx
 * ------------------------------
 * The class schedule, laid out the way Fig. 1 of the requirements lays out
 * the studio's printed timetable: by day, then by time.
 *
 * The same screen serves both roles, because the server already decides what
 * belongs in it — a manager gets every class, an instructor gets the classes
 * they lead (UC6 step 2). The heading says which, so an instructor is not
 * left wondering where the rest of the timetable went.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listClasses } from '../api/classes.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ClassList() {
  const { isManager } = useAuth();
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await listClasses();
        if (!ignore) {
          setClasses(data.classes);
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
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Class schedule</h1>
        <p>
          {isManager
            ? 'Every class in the weekly timetable, in the order it runs.'
            : 'The classes you lead, in the order they run.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading the schedule…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load the schedule">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && classes.length === 0 && (
        <div className="empty-state">
          <p>
            {isManager
              ? 'No classes have been scheduled yet.'
              : 'You are not leading any classes yet.'}
          </p>
          {isManager && (
            <Link className="btn btn--primary" to="/classes/new">
              Schedule the first class
            </Link>
          )}
        </div>
      )}

      {status === 'ready' && classes.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Class schedule</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Day</th>
                <th scope="col">Time</th>
                <th scope="col">Instructor</th>
                <th scope="col">Type</th>
                {/* Pay rate is the studio's business, not something to show
                    an instructor browsing their own timetable. */}
                {isManager && <th scope="col">Pay rate</th>}
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.classId}>
                  <td className="table__id">{item.classId}</td>
                  <td>{item.day}</td>
                  <td>
                    {/* endTime is a virtual, derived on the server from the
                        start and the length so the two cannot disagree. */}
                    {item.time} – {item.endTime}
                  </td>
                  <td>{item.instructorName}</td>
                  <td>
                    <span className="badge">{item.classType}</span>
                  </td>
                  {isManager && <td className="table__id">${item.payRate}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
