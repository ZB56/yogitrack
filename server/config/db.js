/**
 * server/config/db.js
 * -------------------
 * Opens the single, shared connection to MongoDB.
 *
 * Mongoose keeps one connection pool for the whole process, so this runs once
 * at startup and every model in server/models/ uses it automatically. There is
 * no need to pass a connection object around the way you would pass a JDBC
 * Connection in Java.
 */

import mongoose from 'mongoose';

/**
 * Connect to MongoDB using the URI in the environment.
 *
 * NOTE (differs from Java): this function is `async`, so calling it does not
 * block. It immediately returns a Promise — a placeholder for a value that
 * isn't ready yet. The caller must `await` it to wait for the real result.
 *
 * @returns {Promise<void>} resolves once the connection is open
 */
export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  // Fail loudly and early. A missing URI is a setup mistake, and a confusing
  // error 20 seconds later is much harder to diagnose than one right here.
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env and fill it in.'
    );
  }

  // `await` pauses this function until the Promise settles. Everything after
  // this line is guaranteed to run with an open connection.
  await mongoose.connect(uri);

  // Log the host but never the full URI: on Atlas the URI contains a password.
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
