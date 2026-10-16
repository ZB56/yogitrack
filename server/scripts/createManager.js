/**
 * server/scripts/createManager.js
 * -------------------------------
 * Creates the first manager account.
 *
 * Why a script rather than a sign-up page: every account in YogiTrack is
 * created by a manager (see authController.createUser), which leaves the
 * obvious chicken-and-egg problem — the first manager has nobody to create
 * them. A public sign-up page would solve it by letting anyone on the
 * internet make themselves a manager, which is not a trade worth making for
 * a one-off task. This script is run once by whoever sets the studio up.
 *
 * The password is read from the environment and never written to a file:
 *
 *     MANAGER_USERNAME=studio MANAGER_PASSWORD='...' npm run create:manager
 *
 * On Heroku the same thing is done with:
 *
 *     heroku run -a <app> \
 *       MANAGER_USERNAME=studio MANAGER_PASSWORD='...' npm run create:manager
 *
 * Only the bcrypt hash reaches the database. Run it again with the same
 * username and it resets that account's password rather than failing, which
 * is also how a forgotten password is dealt with.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectToDatabase } from '../config/db.js';
import User from '../models/User.js';

const MIN_PASSWORD_LENGTH = 8;

async function createManager() {
  const username = process.env.MANAGER_USERNAME;
  const password = process.env.MANAGER_PASSWORD;

  // Fail before touching the database, with the exact command to run.
  if (!username || !password) {
    throw new Error(
      'Set both MANAGER_USERNAME and MANAGER_PASSWORD, e.g.\n' +
        "  MANAGER_USERNAME=studio MANAGER_PASSWORD='choose-a-long-one' " +
        'npm run create:manager'
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`MANAGER_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  await connectToDatabase();

  const passwordHash = await User.hashPassword(password);
  const existing = await User.findOne({ username: username.toLowerCase() });

  if (existing) {
    // Re-running is a password reset, not an error. The role is forced back to
    // manager in case the account was created as something else.
    existing.passwordHash = passwordHash;
    existing.role = 'manager';
    existing.instructorId = null;
    existing.active = true;
    await existing.save();

    console.log(`Reset the password for existing account "${existing.username}".`);
  } else {
    const user = new User({ username, role: 'manager', passwordHash });
    await user.save();

    console.log(`Created manager account "${user.username}".`);
  }

  // Never log the password itself, not even in a confirmation line: terminal
  // scrollback and CI logs are both places secrets should not end up.
  console.log('Sign in at /login with the password you supplied.');

  await mongoose.disconnect();
}

createManager().catch((error) => {
  console.error(`\nCould not create the manager account:\n${error.message}`);
  process.exit(1);
});
