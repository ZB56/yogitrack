/**
 * client/src/pages/AttendanceList.jsx
 * -----------------------------------
 * The attendance sheets that have been recorded, newest first.
 *
 * One row per class occurrence, with the attendees underneath it. An
 * instructor sees their own sheets and a manager sees all of them, decided by
 * the server from the signed-in user rather than by this screen.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listAttendance } from '../api/attendance.js';

function formatWhen(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AttendanceList() {
  const [sheets, setSheets] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await listAttendance();
        if (!ignore) {
          setSheets(data.attendance);
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
        <h1>Attendance</h1>
        <p>
          {status === 'ready'
            ? `${sheets.length} sheet${sheets.length === 1 ? '' : 's'} recorded.`
            : 'Who attended which class.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading attendance…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load attendance">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && sheets.length === 0 && (
        <div className="empty-state">
          <p>No attendance has been recorded yet.</p>
          <Link className="btn btn--primary" to="/attendance/new">
            Record the first sheet
          </Link>
        </div>
      )}

      {status === 'ready' && sheets.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Attendance sheets</caption>
            <thead>
              <tr>
                <th scope="col">Sheet</th>
                <th scope="col">Class</th>
                <th scope="col">Held</th>
                <th scope="col">Attendees</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.attendanceId}>
                  <td className="table__id">{sheet.attendanceId}</td>
                  <td className="table__id">{sheet.classId}</td>
                  <td>{formatWhen(sheet.heldAt)}</td>
                  <td>
                    {sheet.attendees.map((attendee) => (
                      <div key={attendee.customerId}>
                        {attendee.fullName}{' '}
                        {attendee.usedUnlimited ? (
                          <span className="badge badge--muted">unlimited</span>
                        ) : (
                          <span
                            className={
                              attendee.balanceAfter < 0
                                ? 'table__balance--negative'
                                : 'field__hint'
                            }
                          >
                            {attendee.balanceBefore} → {attendee.balanceAfter}
                          </span>
                        )}
                      </div>
                    ))}
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
