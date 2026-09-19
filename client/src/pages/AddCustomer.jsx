/**
 * client/src/pages/AddCustomer.jsx
 * --------------------------------
 * UC4 — Add a customer.
 *
 * Same shape as UC1: the shared PersonForm does the work, and this page
 * supplies the customer-specific wording and API calls.
 *
 * The one thing customers have that instructors do not is a class balance.
 * It always starts at 0 and is never typed by the manager — a sale (UC5)
 * raises it and attendance (UC6) lowers it — so it is shown on the success
 * panel as confirmation rather than offered as a form field.
 */

import PersonForm from '../components/PersonForm.jsx';
import { checkCustomerName, createCustomer } from '../api/customers.js';

export default function AddCustomer() {
  return (
    <PersonForm
      noun="customer"
      title="Add a customer"
      intro="Use case 4. YogiTrack assigns the customer ID automatically, opens their class balance at zero, and sends a welcome message on the contact method chosen below."
      onCheckName={checkCustomerName}
      onCreate={createCustomer}
      getRecord={(response) => response.customer}
      getRecordId={(customer) => customer.customerId}
      listPath="/customers"
      listLabel="View all customers"
      extraSuccess={(customer) => (
        <p>
          Opening class balance: <strong>{customer.classBalance}</strong>.
          It changes when a package is sold (UC5) or a class is attended (UC6).
        </p>
      )}
    />
  );
}
