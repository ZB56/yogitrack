/**
 * client/src/pages/CustomerList.jsx
 * ---------------------------------
 * Every customer on file, newest first.
 *
 * Mirrors InstructorList, with one extra column: the class balance, which is
 * the number the studio's paper cards exist to track and therefore the most
 * important thing on this screen.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listCustomers } from '../api/customers.js';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  /**
   * The empty dependency array means "run once, after the first render".
   * Omitting it would re-run the effect after every render, and because the
   * fetch sets state that would loop forever.
   */
  useEffect(() => {
    // Guards against a slow response arriving after the user has navigated
    // away, which would otherwise set state on an unmounted component.
    let ignore = false;

    async function load() {
      try {
        const data = await listCustomers();
        if (!ignore) {
          setCustomers(data.customers);
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
        <h1>Customers</h1>
        <p>
          {status === 'ready'
            ? `${customers.length} customer${customers.length === 1 ? '' : 's'} on file.`
            : 'Everyone registered at the studio.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading customers…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load customers">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && customers.length === 0 && (
        <div className="empty-state">
          <p>No customers have been added yet.</p>
          <Link className="btn btn--primary" to="/customers/new">
            Add the first customer
          </Link>
        </div>
      )}

      {status === 'ready' && customers.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Customers</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Prefers</th>
                <th scope="col">Class balance</th>
              </tr>
            </thead>
            <tbody>
              {/* A stable `key` lets React tell rows apart between renders.
                  The array index would be a poor key, because it changes
                  whenever the list is re-sorted. */}
              {customers.map((customer) => (
                <tr key={customer.customerId}>
                  <td className="table__id">{customer.customerId}</td>
                  <td>{customer.fullName}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email}</td>
                  <td>
                    <span className="badge">{customer.preferredContact}</span>
                  </td>
                  {/* A negative balance is legitimate (UC6 allows checking in
                      a customer who has run out), so it is highlighted rather
                      than hidden. */}
                  <td className={customer.classBalance < 0 ? 'table__balance--negative' : 'table__id'}>
                    {customer.classBalance}
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
