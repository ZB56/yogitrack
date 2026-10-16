/**
 * client/src/pages/Reports.jsx
 * ----------------------------
 * UC7 — Generate studio reports. All four on one screen, chosen with tabs.
 *
 * Tabs rather than four separate pages: the four reports answer one question
 * between them ("how is the studio doing?"), and a manager comparing revenue
 * against what the teachers are owed should not be navigating backwards and
 * forwards to do it. Each report is fetched when its tab is opened, so
 * opening this screen runs one aggregation rather than four.
 *
 * The tabs are real <button>s in a tablist, not links: the choice is a view
 * of this screen, not a different place in the application.
 */

import { useEffect, useState } from 'react';
import Alert from '../components/Alert.jsx';
import {
  packageSalesReport,
  instructorReport,
  customerReport,
  teacherPaymentReport,
} from '../api/reports.js';

/** The current month as 'YYYY-MM', for the month input's starting value. */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const TABS = [
  { id: 'package-sales', label: 'Package sales' },
  { id: 'instructors', label: 'Instructors' },
  { id: 'customers', label: 'Customers' },
  { id: 'teacher-payments', label: 'Teacher payment' },
];

export default function Reports() {
  const [tab, setTab] = useState('package-sales');
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  /**
   * Fetch whichever report is open. Re-runs when the tab changes, and when
   * the month changes while the payment report is open.
   */
  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus('loading');
      setData(null);

      try {
        let answer;
        if (tab === 'package-sales') answer = await packageSalesReport();
        else if (tab === 'instructors') answer = await instructorReport();
        else if (tab === 'customers') answer = await customerReport();
        else answer = await teacherPaymentReport(month);

        if (!ignore) {
          setData(answer);
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
  }, [tab, month]);

  return (
    <>
      <div className="page-header">
        <h1>Studio reports</h1>
        <p>
          Use case 7. Each report is a MongoDB aggregation, so the grouping and
          the totals are worked out in the database rather than in the browser.
        </p>
      </div>

      {/* role="tablist" tells a screen reader these buttons switch one view
          rather than navigating, and aria-selected says which is showing. */}
      <div className="tabs" role="tablist" aria-label="Reports">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tabs__tab${tab === item.id ? ' tabs__tab--active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="spinner-text">Running the report…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not run the report">
          <p>{error}</p>
        </Alert>
      )}

      {/* ----------------------------------------------------------------
          Report 1: package sales
          ---------------------------------------------------------------- */}
      {status === 'ready' && tab === 'package-sales' && (
        <>
          <p className="report-summary">
            {data.totals.unitsSold} package
            {data.totals.unitsSold === 1 ? '' : 's'} sold,{' '}
            {formatMoney(data.totals.revenue)} in total.
          </p>

          {data.rows.length === 0 ? (
            <div className="empty-state">
              <p>No sales have been recorded yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="visually-hidden">Package sales</caption>
                <thead>
                  <tr>
                    <th scope="col">Package</th>
                    <th scope="col">Sold</th>
                    <th scope="col">Revenue</th>
                    <th scope="col">First sold</th>
                    <th scope="col">Last sold</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.packageId}>
                      <td>
                        {row.packageName}
                        <span className="field__hint"> {row.packageId}</span>
                      </td>
                      <td className="table__id">{row.unitsSold}</td>
                      <td className="table__id">{formatMoney(row.revenue)}</td>
                      <td>{formatDate(row.firstSoldAt)}</td>
                      <td>{formatDate(row.lastSoldAt)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="table__id">{data.totals.unitsSold}</td>
                    <td className="table__id">{formatMoney(data.totals.revenue)}</td>
                    <td colSpan="2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ----------------------------------------------------------------
          Report 2: instructors, their classes and their check-ins
          ---------------------------------------------------------------- */}
      {status === 'ready' && tab === 'instructors' && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Instructors</caption>
            <thead>
              <tr>
                <th scope="col">Instructor</th>
                <th scope="col">Classes led</th>
                <th scope="col">Classes held</th>
                <th scope="col">Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.instructorId}>
                  <td>
                    {row.fullName}
                    <span className="field__hint"> {row.instructorId}</span>
                  </td>
                  <td>
                    {row.classes.length === 0 ? (
                      <span className="field__hint">None scheduled</span>
                    ) : (
                      row.classes.map((item) => (
                        <div key={item.classId}>
                          {item.classId}: {item.day} {item.time}{' '}
                          <span className="field__hint">({item.classType})</span>
                        </div>
                      ))
                    )}
                  </td>
                  {/* Held: how many times a sheet was filed for one of their
                      classes. Led: how many slots they have in the
                      timetable. The two answer different questions. */}
                  <td className="table__id">{row.classesHeld}</td>
                  <td className="table__id">{row.checkIns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------------------------------------------------------
          Report 3: customers and their packages
          ---------------------------------------------------------------- */}
      {status === 'ready' && tab === 'customers' && (
        <>
          <p className="report-summary">
            {data.summary.customers} customers, {data.summary.withActivePackage} with
            an active package
            {data.summary.negativeBalances > 0 &&
              `, ${data.summary.negativeBalances} with a negative balance`}
            .
          </p>

          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Customers and packages</caption>
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Packages</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.customerId}>
                    <td>
                      {row.fullName}
                      <span className="field__hint"> {row.customerId}</span>
                    </td>
                    <td
                      className={
                        row.classBalance < 0
                          ? 'table__id table__balance--negative'
                          : 'table__id'
                      }
                    >
                      {row.classBalance}
                    </td>
                    <td>
                      {row.packages.length === 0 ? (
                        <span className="field__hint">No packages bought</span>
                      ) : (
                        row.packages.map((entry) => (
                          <div key={entry.saleId}>
                            {entry.packageName}{' '}
                            <span
                              className={
                                entry.status === 'active'
                                  ? 'badge'
                                  : 'badge badge--muted'
                              }
                            >
                              {entry.status}
                            </span>{' '}
                            <span className="field__hint">
                              {formatDate(entry.validFrom)} –{' '}
                              {formatDate(entry.validTo)}
                            </span>
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------------
          Report 4: teacher payment for a month
          ---------------------------------------------------------------- */}
      {tab === 'teacher-payments' && (
        <div className="report-controls">
          <label className="field__label" htmlFor="field-month">
            Month
          </label>
          <input
            id="field-month"
            type="month"
            className="field__input"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
      )}

      {status === 'ready' && tab === 'teacher-payments' && (
        <>
          <p className="report-summary">
            {data.monthLabel}: {data.totals.classesHeld} classes held,{' '}
            {data.totals.checkIns} check-ins,{' '}
            {formatMoney(data.totals.amountDue)} due.
          </p>

          {data.rows.length === 0 ? (
            <div className="empty-state">
              <p>No classes were held in {data.monthLabel}.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="visually-hidden">
                  Teacher payment for {data.monthLabel}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Instructor</th>
                    <th scope="col">Classes held</th>
                    <th scope="col">Check-ins</th>
                    <th scope="col">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.instructorId}>
                      <td>
                        {row.fullName}
                        <span className="field__hint"> {row.instructorId}</span>
                      </td>
                      <td className="table__id">{row.classesHeld}</td>
                      <td className="table__id">{row.checkIns}</td>
                      <td className="table__id">{formatMoney(row.amountDue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="table__id">{data.totals.classesHeld}</td>
                    <td className="table__id">{data.totals.checkIns}</td>
                    <td className="table__id">{formatMoney(data.totals.amountDue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="field__hint">
            Payment is the class pay rate for each time the class was held. A
            class counts as held when an attendance sheet exists for it.
          </p>
        </>
      )}
    </>
  );
}
