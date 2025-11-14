/**
 * Firestore Helper Utilities
 * Provides retry logic and better error handling for Firestore queries
 */

/**
 * Execute a Firestore query with retry logic
 * @param {Function} queryFn - Function that returns a Firestore query promise
 * @param {Object} options - Options for retry behavior
 * @returns {Promise} Query result
 */
export async function executeWithRetry(queryFn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeoutMs = 10000,
    operation = 'Firestore query'
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      // Race between query and timeout
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]);

      return result;

    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = 
        error.code === 1 || // CANCELLED
        error.code === 4 || // DEADLINE_EXCEEDED
        error.code === 14 || // UNAVAILABLE
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT');

      if (!isRetryable || attempt === maxRetries) {
        console.error(`❌ ${operation} failed after ${attempt} attempts:`, {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      // Log retry attempt
      console.warn(`⚠️  ${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError;
}

/**
 * Get a collection with retry logic
 * @param {FirebaseFirestore.CollectionReference} collectionRef - Firestore collection reference
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of documents
 */
export async function getCollection(collectionRef, options = {}) {
  const {
    limit,
    orderBy,
    where,
    ...retryOptions
  } = options;

  return executeWithRetry(
    async () => {
      let query = collectionRef;

      // Apply where clauses
      if (where && Array.isArray(where)) {
        for (const [field, operator, value] of where) {
          query = query.where(field, operator, value);
        }
      }

      // Apply orderBy
      if (orderBy) {
        if (Array.isArray(orderBy)) {
          query = query.orderBy(orderBy[0], orderBy[1] || 'asc');
        } else {
          query = query.orderBy(orderBy);
        }
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return docs;
    },
    {
      ...retryOptions,
      operation: `Get collection ${collectionRef.path}`
    }
  );
}

/**
 * Get a single document with retry logic
 * @param {FirebaseFirestore.DocumentReference} docRef - Firestore document reference
 * @param {Object} options - Retry options
 * @returns {Promise<Object|null>} Document data or null if not found
 */
export async function getDocument(docRef, options = {}) {
  return executeWithRetry(
    async () => {
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    },
    {
      ...options,
      operation: `Get document ${docRef.path}`
    }
  );
}

/**
 * Batch get multiple documents with retry logic
 * @param {Array<FirebaseFirestore.DocumentReference>} docRefs - Array of document references
 * @param {Object} options - Retry options
 * @returns {Promise<Array>} Array of documents
 */
export async function batchGetDocuments(docRefs, options = {}) {
  return executeWithRetry(
    async () => {
      const docs = await Promise.all(
        docRefs.map(ref => ref.get())
      );

      return docs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    },
    {
      ...options,
      operation: 'Batch get documents'
    }
  );
}

/**
 * Run multiple queries in parallel with proper error handling
 * @param {Array<Function>} queryFns - Array of query functions
 * @param {Object} options - Options
 * @returns {Promise<Array>} Array of results (null for failed queries)
 */
export async function runQueriesInParallel(queryFns, options = {}) {
  const { failFast = false } = options;

  if (failFast) {
    // Fail if any query fails
    return Promise.all(queryFns.map(fn => executeWithRetry(fn, options)));
  }

  // Continue even if some queries fail
  const results = await Promise.allSettled(
    queryFns.map(fn => executeWithRetry(fn, options))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`❌ Query ${index + 1} failed:`, result.reason.message);
      return null;
    }
  });
}

/**
 * Gracefully handle Firestore errors
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {String} operation - Operation description
 */
export function handleFirestoreError(error, res, operation = 'Database operation') {
  console.error(`❌ ${operation} error:`, {
    code: error.code,
    message: error.message,
    details: error.details
  });

  // Map Firestore errors to HTTP status codes
  const statusCode = (() => {
    if (error.code === 1) return 503; // CANCELLED
    if (error.code === 3) return 400; // INVALID_ARGUMENT
    if (error.code === 5) return 404; // NOT_FOUND
    if (error.code === 7) return 403; // PERMISSION_DENIED
    if (error.code === 13) return 500; // INTERNAL
    if (error.code === 14) return 503; // UNAVAILABLE
    return 500; // Default to internal server error
  })();

  res.status(statusCode).json({
    error: 'database_error',
    message: `${operation} failed. Please try again.`,
    retryable: [1, 4, 14].includes(error.code)
  });
}
