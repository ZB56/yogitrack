/**
 * client/src/pages/RecordSale.jsx
 * -------------------------------
 * UC5 — Record a sale.
 *
 * The shape of this screen follows the use case exactly: the manager picks a
 * customer and a package, and YogiTrack fills in everything it already knows
 * (UC5 step 2 "auto-populates") rather than asking the manager to retype a
 * price from the wall. The amount, the validity window and the balance all
 * come from the quote endpoint.
 *
 * The auto-filled fields are left EDITABLE rather than read-only, because the
 * use case lists them as data the manager enters. The server re-derives all
 * three and rejects anything that does not match the package's own rules, so
 * nothing depends on the form behaving.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import RadioGroup from '../components/RadioGroup.jsx';
import Alert from '../components/Alert.jsx';
import { listCustomers } from '../api/customers.js';
import { listPackages } from '../api/packages.js';
import { quoteSale, createSale } from '../api/sales.js';

/**
 * An ISO date (yyyy-mm-dd) for a date input, in LOCAL time.
 *
 * `toISOString()` would convert to UTC first, which in a US timezone moves
 * the date back a day for most of the afternoon and evening. Reading the
 * local parts avoids that entirely.
 */
function toDateInput(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The same idea for a datetime-local input: yyyy-mm-ddTHH:MM. */
function toDateTimeInput(value) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${toDateInput(date)}T${hours}:${minutes}`;
}

const EMPTY_FORM = {
  customerId: '',
  packageId: '',
  amountPaid: '',
  paymentMode: '',
  paidAt: '',
  validFrom: '',
  validTo: '',
};

export default function RecordSale() {
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [quote, setQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  // Both dropdowns are needed before the manager can choose anything, and
  // neither depends on the other, so they are fetched together.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [customerData, packageData] = await Promise.all([
          listCustomers(),
          listPackages(),
        ]);
        if (!ignore) {
          setCustomers(customerData.customers);
          setPackages(packageData.packages);
        }
      } catch (caught) {
        if (!ignore) setSubmitError(caught.message);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * UC5 step 2: once both are chosen, ask the server what this sale should
   * look like and fill the form in with the answer.
   */
  useEffect(() => {
    if (!values.customerId || !values.packageId) {
      setQuote(null);
      return undefined;
    }

    let ignore = false;

    async function fetchQuote() {
      try {
        const answer = await quoteSale({
          customerId: values.customerId,
          packageId: values.packageId,
        });

        if (ignore) return;

        setQuote(answer);
        setValues((previous) => ({
          ...previous,
          amountPaid: String(answer.amountDue),
          // "Date and time are current" (step 4), so now is the default.
          paidAt: toDateTimeInput(new Date()),
          validFrom: toDateInput(answer.validFrom),
          validTo: toDateInput(answer.validTo),
        }));
        setErrors({});
      } catch (caught) {
        if (!ignore) {
          setQuote(null);
          setSubmitError(caught.message);
        }
      }
    }

    fetchQuote();
    return () => {
      ignore = true;
    };
  }, [values.customerId, values.packageId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({ ...previous, [name]: value }));

    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setResult(null);
    setSubmitError(null);

    // Only the choices the form itself can judge are checked here. The three
    // rules in UC5 step 4 (price, current date, validity window) all depend
    // on the package, so they belong to the server, which owns the package.
    const validationErrors = {};
    if (!values.customerId) validationErrors.customerId = 'Please choose a customer.';
    if (!values.packageId) validationErrors.packageId = 'Please choose a package.';
    if (!values.paymentMode) validationErrors.paymentMode = 'Please choose a mode of payment.';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await createSale({
        customerId: values.customerId,
        packageId: values.packageId,
        amountPaid: Number(values.amountPaid),
        paymentMode: values.paymentMode,
        paidAt: new Date(values.paidAt).toISOString(),
        validFrom: values.validFrom,
        validTo: values.validTo,
      });

      setResult(response);
      setValues(EMPTY_FORM);
      setQuote(null);
      setErrors({});
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields);
        setSubmitError('Please correct the highlighted fields.');
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Record a sale</h1>
        <p>
          Use case 5. Choose the customer and the package, and YogiTrack fills
          in the price and the validity dates from the price list, then adds
          the classes to the customer&apos;s balance.
        </p>
      </div>

      {result && (
        <Alert variant="success" title="Sale recorded">
          <p>
            {result.sale.saleId}: <strong>{result.sale.packageName}</strong> sold
            to {result.customer.fullName} for ${result.sale.amountPaid.toFixed(2)}{' '}
            ({result.sale.paymentMode}).
          </p>
          {/* UC5 step 6: display the new class balance. */}
          <p>
            {result.sale.unlimited
              ? 'Unlimited package: the customer may attend any class until ' +
                new Date(result.sale.validTo).toLocaleDateString('en-US') + '.'
              : `${result.classesAdded} ${result.classesAdded === 1 ? 'class' : 'classes'} added.`}{' '}
            New class balance: <strong>{result.customer.classBalance}</strong>.
          </p>
          <div className="alert__actions">
            <Link className="btn btn--secondary" to="/sales">
              View all sales
            </Link>
          </div>
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" title="Could not record the sale">
          <p>{submitError}</p>
        </Alert>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="form__section">
            <legend className="form__section-title">Customer and package</legend>
            <div className="form__grid">
              <div className="field">
                <label className="field__label" htmlFor="field-customerId">
                  Customer
                  <span className="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-customerId"
                  name="customerId"
                  value={values.customerId}
                  onChange={handleChange}
                  className={`field__input${errors.customerId ? ' field__input--invalid' : ''}`}
                  aria-invalid={errors.customerId ? 'true' : undefined}
                >
                  <option value="">Choose a customer…</option>
                  {customers.map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.customerId} — {customer.fullName} (balance{' '}
                      {customer.classBalance})
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <span className="field__error">{errors.customerId}</span>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="field-packageId">
                  Package
                  <span className="field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-packageId"
                  name="packageId"
                  value={values.packageId}
                  onChange={handleChange}
                  className={`field__input${errors.packageId ? ' field__input--invalid' : ''}`}
                  aria-invalid={errors.packageId ? 'true' : undefined}
                >
                  <option value="">Choose a package…</option>
                  {packages.map((pkg) => (
                    <option key={pkg.packageId} value={pkg.packageId}>
                      {pkg.name} — {pkg.classesLabel}, ${pkg.price}
                    </option>
                  ))}
                </select>
                {errors.packageId && (
                  <span className="field__error">{errors.packageId}</span>
                )}
              </div>
            </div>

            {/* What the system already knows, shown before the manager
                commits to it. The package's own type matters: a Special
                package only admits its holder to Special classes. */}
            {quote && (
              <div className="message-preview">
                <span className="message-preview__channel">This sale</span>
                <p>
                  <strong>{quote.package.name}</strong> — {quote.package.classesLabel},{' '}
                  {quote.package.classType} classes, {quote.package.category} rate.
                  Valid for {quote.validityDays} days.
                </p>
                <p>
                  {quote.customer.fullName} currently has a balance of{' '}
                  <strong>{quote.customer.classBalance}</strong>.
                </p>
                {!quote.package.isCurrent && (
                  <p>
                    Note: this package is outside its own validity window, so it
                    is not currently on sale.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">Payment</legend>
            <div className="form__grid">
              <FormField
                name="amountPaid"
                label="Amount paid (USD)"
                type="number"
                value={values.amountPaid}
                onChange={handleChange}
                error={errors.amountPaid}
                hint="Taken from the price list"
                required
                min="0"
                step="0.01"
              />

              <FormField
                name="paidAt"
                label="Date and time of payment"
                type="datetime-local"
                value={values.paidAt}
                onChange={handleChange}
                error={errors.paidAt}
                hint="Must be today"
                required
              />

              <RadioGroup
                name="paymentMode"
                legend="Mode of payment"
                value={values.paymentMode}
                onChange={handleChange}
                error={errors.paymentMode}
                required
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Card', label: 'Card' },
                  { value: 'Check', label: 'Check' },
                ]}
              />
            </div>
          </fieldset>

          <fieldset className="form__section">
            <legend className="form__section-title">Validity</legend>
            <div className="form__grid">
              <FormField
                name="validFrom"
                label="Valid from"
                type="date"
                value={values.validFrom}
                onChange={handleChange}
                error={errors.validFrom}
                required
              />
              <FormField
                name="validTo"
                label="Valid to"
                type="date"
                value={values.validTo}
                onChange={handleChange}
                error={errors.validTo}
                hint="Set by the package's own validity period"
                required
              />
            </div>
          </fieldset>

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record the sale'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setValues(EMPTY_FORM);
                setErrors({});
                setQuote(null);
                setSubmitError(null);
              }}
              disabled={saving}
            >
              Clear form
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
