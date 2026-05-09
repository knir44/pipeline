const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'taskmanagement',
  user: process.env.DB_USER || 'taskuser',
  password: process.env.DB_PASSWORD || 'taskpass123',
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error after 5 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Log database connection
const log = (level, message, data = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'database',
    ...data
  };
  
  console.log(`[${logEntry.timestamp}] DB ${level.toUpperCase()}: ${message}`, data);
  
  // Write to log file if logs directory exists
  const logFile = path.join(__dirname, '../../logs/database.log');
  if (fs.existsSync(path.dirname(logFile))) {
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    log('info', 'Database connection successful', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version.split(' ')[0]
    });
    
    return true;
  } catch (error) {
    log('error', 'Database connection failed', {
      error: error.message,
      code: error.code,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    return false;
  }
};

// Execute query with error handling and logging
const query = async (text, params = []) => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    log('debug', 'Executing query', { 
      query: text.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined 
    });
    
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    log('debug', 'Query executed successfully', {
      duration: `${duration}ms`,
      rowCount: result.rowCount,
      command: result.command
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    log('error', 'Query execution failed', {
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      query: text.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined
    });
    throw error;
  } finally {
    client.release();
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    log('debug', 'Transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    log('debug', 'Transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', 'Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

// Health check for database
const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      connected: true,
      response_time: 'fast',
      pool_total: pool.totalCount,
      pool_idle: pool.idleCount,
      pool_waiting: pool.waitingCount
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      pool_total: pool.totalCount,
      pool_idle: pool.idleCount,
      pool_waiting: pool.waitingCount
    };
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    log('info', 'Database pool closed successfully');
  } catch (error) {
    log('error', 'Error closing database pool', { error: error.message });
  }
};

// Handle pool errors
pool.on('error', (err) => {
  log('error', 'Unexpected database pool error', {
    error: err.message,
    code: err.code
  });
});

// Handle pool connect events
pool.on('connect', (client) => {
  log('debug', 'Database client connected', {
    processID: client.processID,
    secretKey: client.secretKey ? '[HIDDEN]' : undefined
  });
});

// Handle pool remove events
pool.on('remove', (client) => {
  log('debug', 'Database client removed', {
    processID: client.processID
  });
});

// Initialize database connection on module load
testConnection().then(connected => {
  if (connected) {
    log('info', 'Database module initialized successfully');
  } else {
    log('error', 'Database module initialization failed');
  }
});

module.exports = {
  query,
  transaction,
  testConnection,
  healthCheck,
  closePool,
  pool
};