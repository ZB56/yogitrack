/**
 * server/controllers/authController.js
 * ------------------------------------
 * Signing in, and the manager's ability to create accounts.
 *
 * Design decision 12 (Manager vs Instructor access) is resolved here: real
 * accounts with hashed passwords and a role, rather than a role selector. The
 * Part 1 review asked for authentication in the final submission, and a
 * selector that anyone can switch is not authentication.
 *
 * Who can do what:
 *   - Anyone may attempt POST /api/auth/login.
 *   - A signed-in user may read GET /api/auth/me.
 *   - Only a manager may create or list accounts. Instructors do not sign
 *     themselves up; the studio decides who works there.
 */

import User from '../models/User.js';
import Instructor from '../models/Instructor.js';
import { issueToken } from '../services/tokens.js';

// The shortest password the application will accept. Long beats clever: a
// length floor is the single most effective rule, and piling on
// character-class requirements mostly produces "Password1!".
const MIN_PASSWORD_LENGTH = 8;

/**
 * Sign in.
 *
 * POST /api/auth/login
 * Body: username, password
 */
export async function login(req, res) {
  const { username = '', password = '' } = req.body;

  if (!username.trim() || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'Please enter both a username and a password.',
    });
  }

  // `.select('+passwordHash')` overrides the schema's `select: false` for this
  // one query. It is the only query in the application that reads the hash.
  const user = await User.findOne({ username: username.trim().toLowerCase() })
    .select('+passwordHash');

  /**
   * One message for every failure: unknown username, wrong password, and
   * deactivated account all answer "Username or password is incorrect."
   *
   * Being more specific would hand an attacker a way to discover which
   * usernames exist, turning one guess into two separate problems. The
   * manager can see the real reason in the account list.
   */
  const genericFailure = {
    error: 'Sign-in failed',
    message: 'Username or password is incorrect.',
  };

  if (!user || !user.active) {
    return res.status(401).json(genericFailure);
  }

  const passwordMatches = await user.verifyPassword(password);
  if (!passwordMatches) {
    return res.status(401).json(genericFailure);
  }

  // Recorded for the account list; a failed attempt deliberately does not
  // update it, so this field always means "last successful sign-in".
  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    message: `Signed in as ${user.username}.`,
    token: issueToken(user),
    user: user.toSafeObject(),
  });
}

/**
 * Who am I? Used by the React app on page load: the browser has a token in
 * storage but the app has no idea yet whether it is still valid.
 *
 * GET /api/auth/me   (any signed-in user)
 */
export async function getCurrentUser(req, res) {
  // req.user was put there by requireAuth, decoded from the token. Re-reading
  // the database rather than trusting the token means an account deactivated
  // ten minutes ago stops working now, not in eight hours.
  const user = await User.findById(req.user.id);

  if (!user || !user.active) {
    return res.status(401).json({
      error: 'Account unavailable',
      message: 'This account is no longer active. Please contact the studio.',
    });
  }

  res.json({ user: user.toSafeObject() });
}

/**
 * Create an account. Manager only.
 *
 * An instructor account must name an existing instructor record, so that UC6
 * can show that instructor their own classes.
 *
 * POST /api/auth/users   (manager only)
 * Body: username, password, role, instructorId (when role is 'instructor')
 */
export async function createUser(req, res) {
  const { username = '', password = '', role = '', instructorId = null } = req.body;

  const fields = {};

  if (!username.trim()) fields.username = 'Username is required.';
  if (!password) {
    fields.password = 'Password is required.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    fields.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!role) fields.role = 'Please choose a role.';
  if (role === 'instructor' && !instructorId) {
    fields.instructorId = 'Please choose which instructor this account is for.';
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please correct the highlighted fields.',
      fields,
    });
  }

  // A username collision is caught by the unique index too, but checking here
  // produces a message pointing at the username field rather than a generic
  // duplicate-key error.
  const taken = await User.findOne({ username: username.trim().toLowerCase() });
  if (taken) {
    return res.status(409).json({
      error: 'Username taken',
      message: 'That username already has an account.',
      fields: { username: 'That username is already in use.' },
    });
  }

  // MongoDB does not enforce references between collections, so the existence
  // of the instructor is checked in code. See docs/06-data-model.md.
  if (role === 'instructor') {
    const instructor = await Instructor.findOne({
      instructorId: String(instructorId).toUpperCase(),
    });

    if (!instructor) {
      return res.status(400).json({
        error: 'Unknown instructor',
        message: `No instructor with id ${instructorId}.`,
        fields: { instructorId: 'No instructor with that id.' },
      });
    }

    // One login per instructor. Two accounts for the same person would make
    // "the classes I lead" ambiguous and the audit trail misleading.
    const existingAccount = await User.findOne({
      instructorId: instructor.instructorId,
    });

    if (existingAccount) {
      return res.status(409).json({
        error: 'Account exists',
        message:
          `${instructor.fullName} already signs in as "${existingAccount.username}".`,
        fields: { instructorId: 'This instructor already has an account.' },
      });
    }
  }

  const user = new User({
    username,
    role,
    instructorId: role === 'instructor' ? String(instructorId).toUpperCase() : null,
    // The plain password is hashed here and then goes out of scope. It is
    // never stored, never logged and never returned.
    passwordHash: await User.hashPassword(password),
  });

  await user.save();

  res.status(201).json({
    message: `Account "${user.username}" created.`,
    user: user.toSafeObject(),
  });
}

/**
 * List accounts, so the manager can see who can sign in.
 *
 * GET /api/auth/users   (manager only)
 */
export async function listUsers(req, res) {
  // passwordHash is excluded by the schema, so there is nothing to strip here.
  const users = await User.find().sort({ createdAt: 1 });

  res.json({
    count: users.length,
    users: users.map((user) => ({
      ...user.toSafeObject(),
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })),
  });
}
