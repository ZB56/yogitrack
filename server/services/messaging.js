/**
 * server/services/messaging.js
 * ----------------------------
 * The single way the application sends a message to a person.
 *
 * Design decision #3 in docs/07-design-decisions.md. UC1, UC4 and UC6 all
 * require sending a confirmation "on the preferred mode of communication".
 * For Part 1 this module records the message and returns it so the UI can show
 * it; for Part 2 the send() function is rewritten to call a real provider
 * (Nodemailer or SendGrid for email, Twilio for SMS). Nothing that calls this
 * module has to change when that happens.
 *
 * Java analogy: an interface with a stub implementation now and a real one
 * later. Keeping the call sites unaware of which is in use is the whole point.
 */

/**
 * Send a message to a person using the contact method they chose.
 *
 * @param {object} recipient
 * @param {string} recipient.firstName
 * @param {string} recipient.email
 * @param {string} recipient.phone
 * @param {'phone'|'email'} recipient.preferredContact
 * @param {string} text - the message body
 * @returns {Promise<object>} a record of what was sent, for display and logging
 */
export async function sendMessage(recipient, text) {
  // Pick the address matching the stated preference. UC1 and UC4 both collect
  // preferredContact precisely so this choice can be made automatically.
  const channel = recipient.preferredContact; // 'phone' or 'email'
  const address = channel === 'email' ? recipient.email : recipient.phone;

  const record = {
    channel,
    address,
    text,
    sentAt: new Date(),
    delivered: false, // Part 1 does not really deliver anything; be honest.
  };

  // PART 1 STUB: log it. Replace this block in Part 2 with a provider call.
  console.log(`[messaging] ${channel} -> ${address}: ${text}`);

  return record;
}

/**
 * Build the welcome message required by UC1 step 8 and UC4 step 8.
 *
 * @param {string} firstName
 * @param {string} id - the generated I##### or C##### id
 * @param {'instructor'|'customer'} role
 * @returns {string}
 */
export function welcomeMessage(firstName, id, role) {
  return (
    `Welcome to Yoga H'om, ${firstName}! ` +
    `You have been registered as ${role === 'instructor' ? 'an instructor' : 'a customer'}. ` +
    `Your ${role} id is ${id}.`
  );
}
