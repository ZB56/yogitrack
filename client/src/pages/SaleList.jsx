/**
 * client/src/pages/SaleList.jsx
 * -----------------------------
 * Every sale the studio has recorded, newest first.
 *
 * The electronic version of the stack of paper cards in Fig. 3: who bought
 * what, when, for how much, and until when it is good for. The status badge
 * (active, future, expired) is a virtual computed on the server, so a window
 * that lapsed overnight reads correctly without anything being rewritten.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listSales } from '../api/sales.js';

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SaleList() {
  const [sales, setSales] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await listSales();
        if (!ignore) {
          setSales(data.sales);
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

  // The studio's takings, which is the first question anyone asks of this
  // screen. Computed from what is displayed rather than fetched separately,
  // so the number and the rows can never disagree.
  const total = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);

  return (
    <>
      <div className="page-header">
        <h1>Sales</h1>
        <p>
          {status === 'ready'
            ? `${sales.length} sale${sales.length === 1 ? '' : 's'} recorded, $${total.toFixed(2)} in total.`
            : 'Packages sold to customers.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading sales…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load sales">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && sales.length === 0 && (
        <div className="empty-state">
          <p>No sales have been recorded yet.</p>
          <Link className="btn btn--primary" to="/sales/new">
            Record the first sale
          </Link>
        </div>
      )}

      {status === 'ready' && sales.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Sales</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Package</th>
                <th scope="col">Paid</th>
                <th scope="col">Method</th>
                <th scope="col">Valid</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.saleId}>
                  <td className="table__id">{sale.saleId}</td>
                  <td>{sale.customerName}</td>
                  <td>
                    {sale.packageName}
                    <br />
                    <span className="field__hint">
                      {sale.unlimited ? 'Unlimited' : `${sale.classesPurchased} classes`}
                    </span>
                  </td>
                  <td className="table__id">${sale.amountPaid.toFixed(2)}</td>
                  <td>{sale.paymentMode}</td>
                  <td>
                    {formatDate(sale.validFrom)} – {formatDate(sale.validTo)}
                  </td>
                  <td>
                    <span
                      className={
                        sale.status === 'active' ? 'badge' : 'badge badge--muted'
                      }
                    >
                      {sale.status}
                    </span>
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
