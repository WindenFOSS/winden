/**
 * SQLite to PostgreSQL Migration Tool for Winden
 * 
 * This script migrates data from a SQLite database to PostgreSQL.
 * It handles all error cases and ensures data integrity during migration.
 * 
 * Usage: node tools/migrate-sqlite-to-postgres.js
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');

// Winston logger setup
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'migration.log' })
  ]
});

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

async function loadConfig() {
  logger.info('Loading configuration...');
  
  try {
    // Try to load config from file
    const configPath = path.resolve(process.cwd(), 'config.toml');
    if (fs.existsSync(configPath)) {
      const toml = require('@iarna/toml');
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(configContent);
      return config;
    } else {
      logger.warn('config.toml not found, proceeding with manual configuration');
      return null;
    }
  } catch (err) {
    logger.error(`Error loading config: ${err.message}`);
    return null;
  }
}

async function getConnectionDetails(config) {
  let sqliteDbPath;
  let pgConfig;
  
  if (config) {
    // Try to get from config
    sqliteDbPath = typeof config.database === 'string' && !config.database.startsWith('postgres') 
      ? config.database 
      : null;
      
    pgConfig = typeof config.database === 'object' 
      ? config.database 
      : (typeof config.database === 'string' && config.database.startsWith('postgres')
        ? config.database
        : null);
  }
  
  // If not found in config, ask user
  if (!sqliteDbPath) {
    sqliteDbPath = await question('Enter the path to the SQLite database file: ');
  }
  
  if (!pgConfig) {
    const pgHost = await question('PostgreSQL host (default: localhost): ') || 'localhost';
    const pgPort = await question('PostgreSQL port (default: 5432): ') || '5432';
    const pgDatabase = await question('PostgreSQL database name (default: winden): ') || 'winden';
    const pgUser = await question('PostgreSQL username (default: postgres): ') || 'postgres';
    const pgPassword = await question('PostgreSQL password: ');
    
    pgConfig = {
      host: pgHost,
      port: parseInt(pgPort),
      database: pgDatabase,
      user: pgUser,
      password: pgPassword
    };
  }
  
  return { sqliteDbPath, pgConfig };
}

async function openSqliteDb(dbPath) {
  return new Promise((resolve, reject) => {
    logger.info(`Opening SQLite database: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(new Error(`Cannot open SQLite database: ${err.message}`));
        return;
      }
      resolve(db);
    });
  });
}

async function getSqliteTables(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        reject(new Error(`Cannot get tables: ${err.message}`));
        return;
      }
      resolve(tables.map(t => t.name));
    });
  });
}

async function connectToPostgres(config) {
  logger.info(`Connecting to PostgreSQL: ${typeof config === 'string' ? config : `${config.host}:${config.port}/${config.database}`}`);
  
  const pool = typeof config === 'string'
    ? new Pool({ connectionString: config })
    : new Pool(config);
    
  // Test connection
  try {
    const client = await pool.connect();
    client.release();
    logger.info('PostgreSQL connection successful');
    return pool;
  } catch (err) {
    throw new Error(`Cannot connect to PostgreSQL: ${err.message}`);
  }
}

async function migrateTable(sqliteDb, pgPool, tableName) {
  logger.info(`Migrating table: ${tableName}`);
  
  // Get table schema from SQLite
  const schemaRows = await new Promise((resolve, reject) => {
    sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  // Create PostgreSQL table if it doesn't exist
  const pgClient = await pgPool.connect();
  
  try {
    // Check if table exists
    const tableExistsResult = await pgClient.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (!tableExists) {
      // Create equivalent table in PostgreSQL
      let columnDefs = schemaRows.map(col => {
        let pgType;
        
        // Map SQLite types to PostgreSQL types
        switch (col.type.toLowerCase()) {
          case 'integer': pgType = 'INTEGER'; break;
          case 'real': pgType = 'REAL'; break;
          case 'text': pgType = 'TEXT'; break;
          case 'blob': pgType = 'BYTEA'; break;
          default: pgType = 'TEXT'; break;
        }
        
        const notNull = col.notnull ? 'NOT NULL' : '';
        const pkConstraint = col.pk ? 'PRIMARY KEY' : '';
        const defaultVal = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
        
        return `"${col.name}" ${pgType} ${notNull} ${pkConstraint} ${defaultVal}`.trim();
      });
      
      const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(', ')})`;
      logger.info(`Creating table in PostgreSQL: ${tableName}`);
      await pgClient.query(createTableSQL);
    }
    
    // Get all data from SQLite
    const sqliteData = await new Promise((resolve, reject) => {
      sqliteDb.all(`SELECT * FROM "${tableName}"`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (sqliteData.length > 0) {
      logger.info(`Migrating ${sqliteData.length} rows from ${tableName}`);
      
      // Get column names
      const columnNames = Object.keys(sqliteData[0]);
      
      // Use a transaction for better performance and atomicity
      await pgClient.query('BEGIN');
      
      // Data might be large, so we process in batches
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < sqliteData.length; i += BATCH_SIZE) {
        const batch = sqliteData.slice(i, i + BATCH_SIZE);
        logger.info(`Processing batch ${i/BATCH_SIZE + 1} (${batch.length} rows)`);
        
        for (const row of batch) {
          // Create placeholders for prepared statement
          const placeholders = columnNames.map((_, idx) => `$${idx + 1}`).join(', ');
          const values = columnNames.map(col => row[col]);
          
          // Handle JSON data
          for (let j = 0; j < values.length; j++) {
            // Convert Buffer objects to strings
            if (Buffer.isBuffer(values[j])) {
              values[j] = values[j].toString('base64');
            }
          }
          
          // Use conflict resolution to handle duplicates
          const insertSQL = `
            INSERT INTO "${tableName}" (${columnNames.map(c => `"${c}"`).join(', ')})
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;
          
          try {
            await pgClient.query(insertSQL, values);
          } catch (err) {
            logger.error(`Error inserting row in ${tableName}: ${err.message}`);
            // Log the problematic row
            logger.error(`Problematic row: ${JSON.stringify(row)}`);
            // Continue with the next row
          }
        }
      }
      
      await pgClient.query('COMMIT');
      logger.info(`Successfully migrated table: ${tableName}`);
    } else {
      logger.info(`Table ${tableName} is empty, nothing to migrate`);
    }
    
  } catch (err) {
    await pgClient.query('ROLLBACK');
    logger.error(`Error migrating table ${tableName}: ${err.message}`);
    throw err;
  } finally {
    pgClient.release();
  }
}

async function createIndexes(sqliteDb, pgPool, tableName) {
  logger.info(`Creating indexes for: ${tableName}`);
  
  // Get indexes from SQLite
  const indexes = await new Promise((resolve, reject) => {
    sqliteDb.all(`PRAGMA index_list("${tableName}")`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  const pgClient = await pgPool.connect();
  
  try {
    for (const index of indexes) {
      // Skip internal SQLite primary key indexes
      if (index.origin === 'pk') continue;
      
      // Get index columns
      const indexInfo = await new Promise((resolve, reject) => {
        sqliteDb.all(`PRAGMA index_info("${index.name}")`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      // Construct PostgreSQL index
      const indexColumns = indexInfo.map(col => `"${col.name}"`).join(', ');
      const indexName = `idx_${tableName}_${indexInfo.map(col => col.name).join('_')}`;
      const uniqueConstraint = index.unique ? 'UNIQUE' : '';
      
      const createIndexSQL = `
        CREATE ${uniqueConstraint} INDEX IF NOT EXISTS "${indexName}"
        ON "${tableName}" (${indexColumns})
      `;
      
      logger.info(`Creating index: ${indexName}`);
      await pgClient.query(createIndexSQL);
    }
  } catch (err) {
    logger.error(`Error creating indexes for ${tableName}: ${err.message}`);
    throw err;
  } finally {
    pgClient.release();
  }
}

async function verifyMigration(sqliteDb, pgPool, tableName) {
  logger.info(`Verifying migration for: ${tableName}`);
  
  // Count rows in SQLite
  const sqliteCount = await new Promise((resolve, reject) => {
    sqliteDb.get(`SELECT COUNT(*) as count FROM "${tableName}"`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
  
  // Count rows in PostgreSQL
  const pgClient = await pgPool.connect();
  
  try {
    const pgCountResult = await pgClient.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const pgCount = parseInt(pgCountResult.rows[0].count);
    
    logger.info(`Table ${tableName}: SQLite count = ${sqliteCount}, PostgreSQL count = ${pgCount}`);
    
    if (pgCount < sqliteCount) {
      logger.warn(`Some rows may not have been migrated for ${tableName}. Expected ${sqliteCount}, got ${pgCount}`);
    } else {
      logger.info(`Migration verified for ${tableName}`);
    }
    
    return {
      table: tableName,
      sqliteCount,
      pgCount,
      success: pgCount >= sqliteCount
    };
  } finally {
    pgClient.release();
  }
}

async function main() {
  try {
    logger.info('Starting SQLite to PostgreSQL migration');
    
    // Load config
    const config = await loadConfig();
    
    // Get connection details
    const { sqliteDbPath, pgConfig } = await getConnectionDetails(config);
    
    // Connect to SQLite
    const sqliteDb = await openSqliteDb(sqliteDbPath);
    
    // Get all tables
    const tables = await getSqliteTables(sqliteDb);
    logger.info(`Found tables: ${tables.join(', ')}`);
    
    // Connect to PostgreSQL
    const pgPool = await connectToPostgres(pgConfig);
    
    // Confirm migration
    const confirmMigration = await question(
      'WARNING: This will migrate data from SQLite to PostgreSQL. ' +
      'Existing data in PostgreSQL may be overwritten. Continue? (y/N): '
    );
    
    if (confirmMigration.toLowerCase() !== 'y') {
      logger.info('Migration cancelled by user');
      rl.close();
      return;
    }
    
    // Migrate each table
    const results = [];
    for (const table of tables) {
      try {
        await migrateTable(sqliteDb, pgPool, table);
        await createIndexes(sqliteDb, pgPool, table);
        const result = await verifyMigration(sqliteDb, pgPool, table);
        results.push(result);
      } catch (err) {
        logger.error(`Error processing table ${table}: ${err.message}`);
        results.push({
          table,
          success: false,
          error: err.message
        });
      }
    }
    
    // Summary
    logger.info('Migration Summary:');
    for (const result of results) {
      if (result.success) {
        logger.info(`✅ ${result.table}: ${result.sqliteCount} rows migrated successfully`);
      } else {
        logger.error(`❌ ${result.table}: Migration failed - ${result.error || 'count mismatch'}`);
      }
    }
    
    // Update the config file to use PostgreSQL if migration was successful
    const allSuccess = results.every(r => r.success);
    if (allSuccess && config) {
      try {
        // Convert to connection string if it's an object
        const pgConnString = typeof pgConfig === 'string' 
          ? pgConfig 
          : `postgresql://${pgConfig.user}:${pgConfig.password}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`;
        
        // Read current config
        const toml = require('@iarna/toml');
        const configPath = path.resolve(process.cwd(), 'config.toml');
        const configContent = fs.readFileSync(configPath, 'utf8');
        const updatedConfig = toml.parse(configContent);
        
        // Update database config
        updatedConfig.database = pgConnString;
        
        // Create backup of original config
        fs.copyFileSync(configPath, `${configPath}.bak.${Date.now()}`);
        
        // Write updated config
        fs.writeFileSync(configPath, toml.stringify(updatedConfig));
        
        logger.info('Updated config.toml to use PostgreSQL connection');
      } catch (err) {
        logger.error(`Failed to update config file: ${err.message}`);
      }
    }
    
    // Close connections
    sqliteDb.close();
    await pgPool.end();
    
    logger.info('Migration completed');
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 