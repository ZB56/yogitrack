/**
 * client/src/pages/PackageList.jsx
 * --------------------------------
 * Every package the studio sells.
 *
 * This is the closest screen to the studio's printed price list (Fig. 2 of
 * the requirements), so it is laid out to be read the same way: what you get,
 * who it is for, how long it lasts, what it costs.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { listPackages } from '../api/packages.js';

/**
 * Format an ISO date string as a short readable date.
 * Dates arrive from the API as ISO strings, not Date objects, because JSON
 * has no date type.
 */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PackageList() {
  const [packages, setPackages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guards against a slow response arriving after the user has navigated
    // away, which would set state on an unmounted component.
    let ignore = false;

    async function load() {
      try {
        const data = await listPackages();
        if (!ignore) {
          setPackages(data.packages);
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
        <h1>Packages</h1>
        <p>
          {status === 'ready'
            ? `${packages.length} package${packages.length === 1 ? '' : 's'} on file.`
            : 'What the studio sells.'}
        </p>
      </div>

      {status === 'loading' && <p className="spinner-text">Loading packages…</p>}

      {status === 'error' && (
        <Alert variant="error" title="Could not load packages">
          <p>{error}</p>
        </Alert>
      )}

      {status === 'ready' && packages.length === 0 && (
        <div className="empty-state">
          <p>No packages have been added yet.</p>
          <Link className="btn btn--primary" to="/packages/new">
            Add the first package
          </Link>
        </div>
      )}

      {status === 'ready' && packages.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Packages</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Package</th>
                <th scope="col">Category</th>
                <th scope="col">Classes</th>
                <th scope="col">Class type</th>
                <th scope="col">Valid</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.packageId}>
                  <td className="table__id">{pkg.packageId}</td>
                  <td>{pkg.name}</td>
                  <td>
                    <span className="badge">{pkg.category}</span>
                  </td>
                  {/* classesLabel is a virtual: "Unlimited" or "10 classes",
                      derived on the server so it cannot disagree with the
                      unlimited flag and the count it is built from. */}
                  <td>{pkg.classesLabel}</td>
                  <td>{pkg.classType}</td>
                  <td>
                    {formatDate(pkg.startDate)} – {formatDate(pkg.endDate)}
                    {/* isCurrent is also derived: whether today falls inside
                        the validity window. UC5 will need it to decide which
                        packages can be sold. */}
                    {!pkg.isCurrent && (
                      <span className="badge badge--muted"> not current</span>
                    )}
                  </td>
                  <td className="table__id">${pkg.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
