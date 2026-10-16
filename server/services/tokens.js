/**
 * server/services/tokens.js
 * -------------------------
 * Issues and verifies the JSON Web Tokens that carry a signed-in user's
 * identity between requests.
 *
 * Why a token at all: HTTP is stateless, so the server forgets everything
 * between one request and the next. After a successful login the server hands
 * the browser a token; the browser sends it back with every later request,
 * and the server can trust it because it is signed with a secret only the
 * server knows. Tamper with a single character of the payload and the
 * signature no longer matches.
 *
 * Why a token rather than a server-side session: a session needs somewhere to
 * live. On Heroku the dyno restarts at least daily and its filesystem is
 * discarded, so in-memory sessions would log everyone out, and a shared store
 * would mean another piece of infrastructure to run. A signed token needs no
 * storage at all. The trade-off is that a token cannot be revoked before it
 * expires, which is why the lifetime is short.
 *
 * Java analogy: this is the small utility class wrapping a JWT library that a
 * Spring Security setup would configure declaratively.
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

// How long a token stays valid. Eight hours is about one studio shift: long
// enough that a manager is not asked to sign in again mid-afternoon, short
// enough that a token copied off a shared front-desk computer stops working
// the same day.
const TOKEN_LIFETIME = '8h';

/**
 * The secret the signature is computed with.
 *
 * In production it MUST come from the environment (a Heroku config var), and
 * the server refuses to start without it: a predictable secret would let
 * anyone mint their own manager token, which is worse than being down.
 *
 * In development, a missing secret is filled in with a random one generated at
 * startup. That keeps local setup to one step and makes the weaker case
 * obvious — restarting the server invalidates every token, so everyone has to
 * sign in again.
 */
function resolveSecret() {
  const fromEnvironment = process.env.JWT_SECRET;

  if (fromEnvironment) return fromEnvironment;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is not set. Set it as a config var before starting in production.'
    );
  }

  // 48 random bytes, hex-encoded. Generated once per process.
  const generated = crypto.randomBytes(48).toString('hex');
  console.warn(
    '[auth] JWT_SECRET is not set, so a random development secret was generated. ' +
      'Tokens will stop working when the server restarts.'
  );
  return generated;
}

// Resolved once, when this module is first imported, rather than on every
// call — otherwise each request would generate a different development secret
// and no token would ever verify.
const SECRET = resolveSecret();

/**
 * Create a token for a signed-in user.
 *
 * The payload is deliberately small: an id, a username, a role and (for an
 * instructor) their instructor id. It is signed, not encrypted — anyone
 * holding the token can read these values, so nothing private goes in it.
 *
 * @param {object} user - a User document
 * @returns {string} the signed token
 */
export function issueToken(user) {
  return jwt.sign(
    {
      // `sub` ("subject") is the standard claim for who the token is about.
      sub: String(user._id),
      username: user.username,
      role: user.role,
      instructorId: user.instructorId || null,
    },
    SECRET,
    { expiresIn: TOKEN_LIFETIME }
  );
}

/**
 * Verify a token and return its payload.
 *
 * jwt.verify checks the signature AND the expiry, and throws if either fails.
 * The caller treats any throw as "not signed in".
 *
 * @param {string} token
 * @returns {object} the decoded payload
 * @throws {Error} if the token is missing, altered or expired
 */
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
