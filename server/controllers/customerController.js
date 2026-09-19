/**
 * server/controllers/customerController.js
 * ----------------------------------------
 * The business rules for UC4, "Add a customer".
 *
 * Deliberately parallel to instructorController.js. UC1 and UC4 are the same
 * use case applied to two different kinds of person, so the code reads the
 * same way; the shared parts (the name-matching rule, the six demographic
 * fields, ID generation, messaging) are imported rather than repeated.
 *
 * As in the instructor controller, no try/catch is needed: Express 5 forwards
 * errors thrown in an async handler to middleware/errorHandler.js by itself.
 */

import Customer from '../models/Customer.js';
import { generateId } from '../services/idGenerator.js';
import { sendMessage, welcomeMessage } from '../services/messaging.js';
import { buildNameQuery } from '../utils/nameLookup.js';

/**
 * Find customers already recorded under a given name (UC4 steps 2-3).
 * GET /api/customers/check-name?firstName=Sam&lastName=Ray
 */
export async function checkCustomerName(req, res) {
  const { firstName = '', lastName = '' } = req.query;

  if (!firstName.trim() || !lastName.trim()) {
    return res.status(400).json({
      error: 'Missing name',
      message: 'Both first and last name are needed to check for duplicates.',
    });
  }

  const matches = await Customer.find(
    buildNameQuery(firstName, lastName)
  ).select('customerId firstName lastName email');

  res.json({
    exists: matches.length > 0,
    count: matches.length,
    matches,
  });
}

/**
 * Create a customer. UC4 steps 4-8.
 *
 * POST /api/customers
 * Body: firstName, lastName, address, phone, email, preferredContact,
 *       plus confirmDuplicate: true once the manager has been warned.
 */
export async function createCustomer(req, res) {
  const {
    firstName,
    lastName,
    address,
    phone,
    email,
    preferredContact,
    confirmDuplicate = false,
  } = req.body;

  // UC4 step 3. Enforced here as well as in the UI, because a request can
  // reach this endpoint without having gone through the form.
  if (!confirmDuplicate && firstName && lastName) {
    const duplicates = await Customer.countDocuments(
      buildNameQuery(firstName, lastName)
    );

    if (duplicates > 0) {
      // 409, not 400: the data is valid, it just needs confirming. Two
      // customers may genuinely share a name.
      return res.status(409).json({
        error: 'Duplicate name',
        requiresConfirmation: true,
        message:
          `${duplicates} customer${duplicates > 1 ? 's are' : ' is'} already ` +
          `recorded as ${firstName} ${lastName}. Add this person anyway?`,
      });
    }
  }

  // Build in memory. Nothing reaches the database until .save() below.
  //
  // classBalance is NOT taken from the request. UC4 fixes the opening balance
  // at 0, and it is changed only by recording a sale (UC5) or attendance
  // (UC6). Accepting it from the form would let a manager type themselves a
  // balance that no sale paid for.
  const customer = new Customer({
    firstName,
    lastName,
    address,
    phone,
    email,
    preferredContact,
  });

  // UC4 step 6: validate before an ID is issued, so that a rejected form
  // never consumes a counter number. See design decision 15.
  await customer.validate({ pathsToSkip: ['customerId'] });

  // UC4 step 4.
  customer.customerId = await generateId('customer');

  // UC4 step 7.
  await customer.save();

  // UC4 step 8: welcome message on the customer's preferred channel.
  const notification = await sendMessage(
    customer,
    welcomeMessage(customer.firstName, customer.customerId, 'customer')
  );

  res.status(201).json({
    message: `Customer ${customer.customerId} saved successfully.`,
    customer,
    notification,
  });
}

/**
 * List customers, newest first.
 * GET /api/customers
 */
export async function listCustomers(req, res) {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json({ count: customers.length, customers });
}

/**
 * Fetch one customer by their readable ID.
 * GET /api/customers/C00001
 */
export async function getCustomer(req, res) {
  const customer = await Customer.findOne({
    customerId: req.params.customerId.toUpperCase(),
  });

  if (!customer) {
    return res.status(404).json({
      error: 'Not found',
      message: `No customer with id ${req.params.customerId}.`,
    });
  }

  res.json({ customer });
}
