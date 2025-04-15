/**
 *  Winden database handler
 */

/**
 * @module WindenDB
 * @version 0.4.0
 * @description PostgreSQL database adapter for Winden Next 4.x with big fancy features or something.
 */

const { Pool } = require('pg');
const path = require('path');
const winston = require('winston');
const fs = require('fs');

// Configure Winston logger
const dbLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/db.log' })
  ]
});

// Ensure logs directory exists
try {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
} catch (err) {
  console.error('Failed to create logs directory:', err);
}

/**
 * @class WindenDB
 * @description Main database class that handles all database operations with queuing and TTL support
 */
class WindenDB {
  /**
   * @constructor
   * @param {string|object} dbConfig - Database configuration string or object
   * @throws {Error} If database configuration is not provided or connection fails... 
   */
  constructor(dbConfig) {
    if (!dbConfig) {
      throw new Error('Database configuration is required');
    }

    let connectionConfig;

    if (typeof dbConfig === 'string') {
      // Handle string configuration (connection URL or previous SQLite path)
      if (dbConfig.startsWith('postgres://') || dbConfig.startsWith('postgresql://')) {
        connectionConfig = dbConfig;
      } else {
        // Default config for backward compatibility
        connectionConfig = {
          host: 'localhost',
          port: 5432,
          database: 'winden',
          user: 'postgres',
          password: 'postgres'
        };
        console.warn('Using default PostgreSQL configuration. Please update to use a proper PostgreSQL connection string.');
      }
    } else {
      // Handle object configuration
      connectionConfig = dbConfig;
    }

    // Add essential pool configuration for production
    const poolConfig = typeof connectionConfig === 'string' 
      ? { connectionString: connectionConfig } 
      : connectionConfig;
    
    // Add pool management settings
    this.poolConfig = {
      ...poolConfig,
      max: 20,                   // Maximum 20 clients in pool
      idleTimeoutMillis: 30000,  // Close idle clients after 30s
      connectionTimeoutMillis: 5000, // Connection timeout
      statement_timeout: 10000,  // Statement timeout
      query_timeout: 10000,      // Query timeout
      keepAlive: true,           // Keep connections alive
      ssl: process.env.NODE_ENV === 'production' ? 
        { rejectUnauthorized: false } : undefined  // SSL in production
    };

    this.pool = new Pool(this.poolConfig);
    
    this.pool.on('error', (err, client) => {
      dbLogger.error('Unexpected database pool error:', { 
        error: err.message,
        stack: err.stack
      });
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      client.on('error', (err) => {
        dbLogger.error('Database client error:', { 
          error: err.message,
          stack: err.stack
        });
      });
    });

    this.namespace = 'winden';
    this.ttlSupport = true;
    this.queue = [];
    this.isProcessing = false;
    this.totalOperationTime = 0;
    this.operationCount = 0;
    this.maxQueueSize = 10000; // Prevent unbounded queue growth
    this.tableName = 'winden'; // Default table name
    this.maxRetries = 3;       // Max retries for failed operations
    this.retryDelay = 500;     // Delay between retries in ms

    // Initialize the database table
    this.initializeDatabase().catch(err => {
      dbLogger.error('Failed to initialize database:', { 
        error: err.message,
        stack: err.stack
      });
      console.error('Failed to initialize database:', err);
    });

    // Log queue stats every 5 seconds
    setInterval(() => this.logQueueStats(), 5000);

    // Cleanup expired entries periodically if TTL is supported
    if (this.ttlSupport) {
      setInterval(() => this.cleanupExpired(), 60000);
    }

    // Health check
    setInterval(() => this.healthCheck(), 15000);
  }

  /**
   * @async
   * @method healthCheck
   * @description Performs a health check on the database
   * @returns {Promise<void>}
   */
  async healthCheck() {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        dbLogger.info('Database health check: OK', {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount
        });
      } catch (err) {
        dbLogger.error('Database health check failed:', { 
          error: err.message,
          stack: err.stack
        });
      } finally {
        client.release();
      }
    } catch (err) {
      dbLogger.error('Failed to acquire client for health check:', { 
        error: err.message,
        stack: err.stack
      });
      
      // Try to recover by creating a new pool if there are repeated connection failures
      if (err.message.includes('connect ECONNREFUSED') || 
          err.message.includes('too many clients')) {
        this.recreatePool();
      }
    }
  }

  /**
   * @method recreatePool
   * @description Recreates the connection pool in case of severe failures
   */
  recreatePool() {
    dbLogger.warn('Recreating database connection pool due to connection issues');
    
    // Close existing pool gracefully
    this.pool.end().catch(err => {
      dbLogger.error('Error closing existing pool:', { error: err.message });
    });
    
    // Create new pool with the same config
    this.pool = new Pool(this.poolConfig);
    
    this.pool.on('error', (err, client) => {
      dbLogger.error('Unexpected database pool error:', { 
        error: err.message,
        stack: err.stack
      });
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * @async
   * @method initializeDatabase
   * @description Initializes database tables and indexes
   * @returns {Promise<void>}
   */
  async initializeDatabase() {
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        // First check if keyv table exists
        const tableCheck = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'keyv'"
        );
        
        if (tableCheck.rows.length > 0) {
          console.log('Using Winden Legacy compatibility mode - Found existing keyv database');
          this.tableName = 'keyv';
          this.namespace = 'keyv';
          return;
        }

        // Check if winden table exists
        const windenTableCheck = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'winden'"
        );
        
        if (windenTableCheck.rows.length > 0) {
          dbLogger.info('Winden table already exists');
          return;
        }

        // Create winden table if it doesn't exist
        await client.query('BEGIN');
        
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS winden (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_winden_key ON winden (key)
          `);
          
          // Create an index for faster expiration queries
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_winden_expires ON winden ((value::jsonb->>'expires'))
            WHERE (value::jsonb->>'expires') IS NOT NULL
          `);
          
          await client.query('COMMIT');
          dbLogger.info('Successfully initialized database tables and indexes');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method executeQueryWithRetry
   * @description Executes a database operation with retries
   * @param {Function} operation - Database operation to execute
   * @param {number} [retries=0] - Current retry count
   * @returns {Promise<any>} Result of the operation
   * @throws {Error} If all retries fail
   */
  async executeQueryWithRetry(operation, retries = 0) {
    try {
      return await this.executeQuery(operation);
    } catch (err) {
      // Specific errors that warrant a retry
      const retryableErrors = [
        'connection timeout',
        'Connection terminated',
        'Connection terminated unexpectedly',
        'ECONNRESET',
        'database connection error',
        'Connection terminated during query execution',
        'deadlock detected'
      ];
      
      const shouldRetry = retryableErrors.some(msg => err.message.includes(msg));
      
      if (shouldRetry && retries < this.maxRetries) {
        dbLogger.warn(`Retrying database operation (${retries + 1}/${this.maxRetries}): ${err.message}`);
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeQueryWithRetry(operation, retries + 1);
      }
      
      throw err;
    }
  }

  /**
   * @async
   * @method executeQuery
   * @description Executes a database operation with queuing and timeout
   * @param {Function} operation - Database operation to execute
   * @returns {Promise<any>} Result of the operation
   * @throws {Error} If queue is full or operation times out
   */
  async executeQuery(operation) {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Database queue is full');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database operation timed out'));
      }, 30000); // 30 second timeout

      this.queue.push({
        operation,
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        addedAt: Date.now()
      });
      
      this.processQueue();
    });
  }

  /**
   * @async
   * @method processQueue
   * @description Processes the next operation in the queue
   * @private
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const item = this.queue.shift();
    const { operation, resolve, reject, addedAt } = item;
    
    // Log if operation has been in queue for too long
    const queueTime = Date.now() - addedAt;
    if (queueTime > 5000) {
      dbLogger.warn(`Operation was queued for ${queueTime}ms`, {
        queueLength: this.queue.length
      });
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      const operationTime = Date.now() - startTime;
      this.updateStats(operationTime);
      
      // Log successful transaction
      if (operationTime > 1000) {
        dbLogger.warn('Slow database transaction', {
          operationTime,
          queueLength: this.queue.length
        });
      } else {
        dbLogger.info('Database transaction completed', {
          operationTime,
          queueLength: this.queue.length
        });
      }
      
      resolve(result);
    } catch (error) {
      // Log failed transaction
      dbLogger.error('Database transaction failed', {
        error: error.message,
        stack: error.stack,
        queueLength: this.queue.length
      });
      
      console.error('Database operation failed:', error);
      reject(error);
    } finally {
      this.isProcessing = false;
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * @async
   * @method cleanupExpired
   * @description Removes expired entries from database
   * @returns {Promise<void>}
   */
  async cleanupExpired() {
    if (!this.ttlSupport) return;
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        // Use EXPLAIN ANALYZE to check query performance
        const explainQuery = await client.query(`
          EXPLAIN ANALYZE 
          DELETE FROM ${this.tableName} 
          WHERE (value::jsonb->>'expires')::numeric < $1
        `, [Date.now()]);
        
        // If the query is going to be slow, log it
        const explainResult = explainQuery.rows.map(row => row["QUERY PLAN"]).join('\n');
        if (explainResult.includes('Seq Scan') && !explainResult.includes('cost=0.00')) {
          dbLogger.warn('Slow cleanup query detected:', { explain: explainResult });
        }
        
        // Execute the actual delete
        const result = await client.query(`
          DELETE FROM ${this.tableName} 
          WHERE (value::jsonb->>'expires')::numeric < $1
          RETURNING COUNT(*)
        `, [Date.now()]);
        
        const count = parseInt(result.rows[0]?.count || '0');
        if (count > 0) {
          dbLogger.info(`Cleaned up ${count} expired entries`);
        }
        
        return count;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method get
   * @description Retrieves a value by key
   * @param {string} key - Key to retrieve
   * @returns {Promise<any>} Retrieved value
   * @throws {Error} If key is not provided or value parsing fails
   */
  async get(key) {
    if (!key) throw new Error('Key is required');
    
    const sanitizedKey = this.sanitizeKey(key);
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          `SELECT value FROM ${this.tableName} WHERE key = $1`, 
          [`${this.namespace}:${sanitizedKey}`]
        );
        
        if (result.rows.length > 0) {
          try {
            const parsed = JSON.parse(result.rows[0].value);
            if (this.ttlSupport && parsed.expires && parsed.expires < Date.now()) {
              // Expired value - delete and return undefined
              this.delete(key).catch(err => {
                dbLogger.error(`Error deleting expired key ${key}:`, { error: err.message });
              });
              return undefined;
            } else {
              return parsed.value;
            }
          } catch (e) {
            dbLogger.error(`Failed to parse stored value for key ${key}:`, { error: e.message });
            throw new Error(`Failed to parse stored value: ${e.message}`);
          }
        } else {
          return undefined;
        }
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method set
   * @description Sets a value with optional TTL
   * @param {string} key - Key to set
   * @param {any} value - Value to store
   * @param {number} [ttl] - Time-to-live in milliseconds
   * @returns {Promise<void>}
   * @throws {Error} If key is not provided
   */
  async set(key, value, ttl) {
    if (!key) throw new Error('Key is required');
    
    const sanitizedKey = this.sanitizeKey(key);
    const expires = this.ttlSupport && ttl ? Date.now() + ttl : undefined;
    
    // Check if value is serializable
    let serializedValue;
    try {
      serializedValue = JSON.stringify({
        value,
        expires
      });
    } catch (err) {
      dbLogger.error(`Failed to serialize value for key ${key}:`, { error: err.message });
      throw new Error(`Failed to serialize value: ${err.message}`);
    }

    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        await client.query(`
          INSERT INTO ${this.tableName} (key, value, updated_at) 
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE 
          SET value = $2, updated_at = NOW()
        `, [`${this.namespace}:${sanitizedKey}`, serializedValue]);
        
        return true;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method delete
   * @description Deletes a value by key
   * @param {string} key - Key to delete
   * @returns {Promise<boolean>} True if key was deleted
   * @throws {Error} If key is not provided
   */
  async delete(key) {
    if (!key) throw new Error('Key is required');
    
    const sanitizedKey = this.sanitizeKey(key);
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          DELETE FROM ${this.tableName} 
          WHERE key = $1
          RETURNING key
        `, [`${this.namespace}:${sanitizedKey}`]);
        
        return result.rowCount > 0;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method clear
   * @description Clears all values in the current namespace
   * @returns {Promise<number>} Number of deleted entries
   */
  async clear() {
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          DELETE FROM ${this.tableName} 
          WHERE key LIKE $1
          RETURNING COUNT(*)
        `, [`${this.namespace}:%`]);
        
        const count = parseInt(result.rows[0]?.count || '0');
        dbLogger.info(`Cleared ${count} entries from namespace ${this.namespace}`);
        return count;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method has
   * @description Checks if a key exists
   * @param {string} key - Key to check
   * @returns {Promise<boolean>} True if key exists
   * @throws {Error} If key is not provided
   */
  async has(key) {
    if (!key) throw new Error('Key is required');
    
    const sanitizedKey = this.sanitizeKey(key);
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT 1 FROM ${this.tableName} 
          WHERE key = $1
        `, [`${this.namespace}:${sanitizedKey}`]);
        
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @method sanitizeKey
   * @description Sanitizes a key to prevent SQL injection
   * @param {string} key - The key to sanitize
   * @returns {string} Sanitized key
   */
  sanitizeKey(key) {
    if (typeof key !== 'string') {
      return String(key);
    }
    // Basic sanitation - remove problematic characters
    return key.replace(/[;'"\\]/g, '_');
  }

  /**
   * @async
   * @method close
   * @description Closes database connection
   * @returns {Promise<void>}
   */
  async close() {
    dbLogger.info('Closing database connection pool');
    return this.pool.end();
  }

  /**
   * @method updateStats
   * @description Updates operation statistics
   * @param {number} operationTime - Time taken for operation in milliseconds
   * @private
   */
  updateStats(operationTime) {
    this.totalOperationTime += operationTime;
    this.operationCount++;
    
    // Reset stats periodically to prevent overflow
    if (this.operationCount > 1000000) {
      this.totalOperationTime = operationTime;
      this.operationCount = 1;
    }
  }

  /**
   * @method logQueueStats
   * @description Logs queue statistics
   * @private
   */
  logQueueStats() {
    const avgOperationTime = this.operationCount > 0 ? this.totalOperationTime / this.operationCount : 0;
    
    // Only log if there's activity
    if (this.queue.length > 0 || this.operationCount > 0) {
      dbLogger.info('Queue statistics', {
        queueLength: this.queue.length,
        averageOperationTime: avgOperationTime.toFixed(2),
        poolTotalConnections: this.pool.totalCount,
        poolIdleConnections: this.pool.idleCount,
        poolWaitingClients: this.pool.waitingCount
      });
    }
  }

  /**
   * @async
   * @method getAll
   * @description Retrieves all key-value pairs in the current namespace
   * @returns {Promise<Object>} Object containing all key-value pairs
   */
  async getAll() {
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT key, value FROM ${this.tableName} 
          WHERE key LIKE $1
        `, [`${this.namespace}:%`]);
        
        const data = {};
        for (const row of result.rows) {
          const key = row.key.replace(`${this.namespace}:`, '');
          try {
            const parsed = JSON.parse(row.value);
            if (!(this.ttlSupport && parsed.expires && parsed.expires < Date.now())) {
              data[key] = parsed.value;
            }
          } catch (e) {
            dbLogger.error(`Failed to parse value for key ${key}:`, { error: e.message });
          }
        }
        
        return data;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method search
   * @description Searches for keys matching a pattern
   * @param {string} pattern - Search pattern (SQL LIKE pattern)
   * @returns {Promise<string[]>} Array of matching keys
   */
  async search(pattern) {
    const sanitizedPattern = this.sanitizeKey(pattern);
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT key FROM ${this.tableName} 
          WHERE key LIKE $1
        `, [`${this.namespace}:${sanitizedPattern}`]);
        
        return result.rows.map(row => row.key.replace(`${this.namespace}:`, ''));
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method setMultiple
   * @description Sets multiple key-value pairs at once
   * @param {Object} entries - Object containing key-value pairs to set
   * @param {number} [ttl] - Optional TTL for all entries
   * @returns {Promise<boolean>} Success status
   */
  async setMultiple(entries, ttl) {
    if (!entries || typeof entries !== 'object' || Object.keys(entries).length === 0) {
      return false;
    }
    
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const [key, value] of Object.entries(entries)) {
          const sanitizedKey = this.sanitizeKey(key);
          const data = JSON.stringify({
            value,
            expires: this.ttlSupport && ttl ? Date.now() + ttl : undefined
          });
          
          await client.query(`
            INSERT INTO ${this.tableName} (key, value, updated_at) 
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE 
            SET value = $2, updated_at = NOW()
          `, [`${this.namespace}:${sanitizedKey}`, data]);
        }
        
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method createMigrationTable
   * @description Creates a table to track migrations
   * @returns {Promise<void>}
   */
  async createMigrationTable() {
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS winden_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } finally {
        client.release();
      }
    });
  }

  /**
   * @async
   * @method runDiagnostics
   * @description Runs diagnostics on the database
   * @returns {Promise<Object>} Diagnostic information
   */
  async runDiagnostics() {
    return this.executeQueryWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        // Get PostgreSQL version
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0].version;
        
        // Get table statistics
        const tableStatsQuery = await client.query(`
          SELECT 
            count(*) as total_rows,
            pg_size_pretty(pg_total_relation_size('${this.tableName}')) as table_size
          FROM ${this.tableName}
        `);
        
        const tableStats = tableStatsQuery.rows[0];
        
        // Get index statistics
        const indexStatsQuery = await client.query(`
          SELECT
            indexname,
            pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
          FROM pg_indexes
          WHERE tablename = '${this.tableName}'
        `);
        
        // Check for slow queries
        const slowQueriesQuery = await client.query(`
          EXPLAIN ANALYZE 
          SELECT * FROM ${this.tableName} 
          WHERE key LIKE '${this.namespace}:%' 
          LIMIT 10
        `);
        
        const slowQueriesAnalysis = slowQueriesQuery.rows.map(row => row["QUERY PLAN"]).join('\n');
        
        return {
          version,
          tableStats,
          indexStats: indexStatsQuery.rows,
          queryAnalysis: slowQueriesAnalysis,
          poolStats: {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingConnections: this.pool.waitingCount
          }
        };
      } finally {
        client.release();
      }
    });
  }
}

module.exports = WindenDB;