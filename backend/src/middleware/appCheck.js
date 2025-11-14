import admin from 'firebase-admin';

/**
 * Middleware to verify Firebase App Check tokens.
 * Requires firebase-admin to be initialized in the project.
 * Use ENFORCE_APP_CHECK env var to toggle enforcement in dev.
 */
export async function verifyAppCheck(req, res, next) {
  try {
    if (!process.env.ENFORCE_APP_CHECK || process.env.ENFORCE_APP_CHECK === 'false') {
      return next();
    }

    const token = req.header('X-Firebase-AppCheck') || req.header('x-firebase-appcheck');
    if (!token) {
      return res.status(401).json({ error: 'appcheck_missing' });
    }

    await admin.appCheck().verifyToken(token);
    return next();
  } catch (err) {
    console.error('App Check verification failed:', err?.message || err);
    return res.status(401).json({ error: 'appcheck_invalid' });
  }
}
