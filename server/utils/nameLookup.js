/**
 * server/utils/nameLookup.js
 * --------------------------
 * The name-matching rule shared by the instructor and customer duplicate
 * checks (UC1 step 2 and UC4 step 2).
 *
 * Both use cases ask the same question — "is anyone already on file under
 * this name?" — and must answer it the same way. Written once here so that
 * the two cannot drift apart: a change to how names are compared has to apply
 * to both, and now does so by construction.
 */

/**
 * Escape characters that carry a special meaning inside a regular expression.
 *
 * Without this, a name containing "." or "(" would be interpreted as a regex
 * operator rather than a literal character. That is wrong at best, and at
 * worst it lets user input change what the query means.
 *
 * @param {string} text
 * @returns {string} text that is safe to embed in a RegExp
 */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the MongoDB filter that finds people recorded under a given name.
 *
 * Matching is case-insensitive, because "ann lee" and "Ann Lee" are the same
 * person as far as a studio manager is concerned. It is also anchored with
 * ^ and $, so that "Ann" does not also match "Annabel".
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {object} a Mongoose query filter
 */
export function buildNameQuery(firstName, lastName) {
  return {
    firstName: new RegExp(`^${escapeRegex(firstName.trim())}$`, 'i'),
    lastName: new RegExp(`^${escapeRegex(lastName.trim())}$`, 'i'),
  };
}
