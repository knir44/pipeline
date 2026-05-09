const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const Task = require('./models/Task');

const PORT = process.env.PORT || 3000;

// Simple logging to file
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const log = (level, message, data = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'api',
    ...data
  };
  
  console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`, data);
  
  // Write to log file
  const logFile = path.join(logDir, 'application.log');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// Helper to parse JSON body
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Set CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Error response helper
const sendError = (res, statusCode, error, message, code) => {
  const errorResponse = {
    error,
    message,
    code,
    timestamp: new Date().toISOString()
  };
  
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(errorResponse, null, 2));
};

// Success response helper
const sendSuccess = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsedUrl.pathname;
  
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  log('info', `${method} ${pathname}`, { 
    userAgent: req.headers['user-agent'],
    ip: req.connection.remoteAddress 
  });
  
  try {
    // Home page
    if (pathname === '/' && method === 'GET') {
      const welcomeData = {
        message: "🚀 Task Management API with PostgreSQL",
        version: "2.0.0",
        database: "PostgreSQL with pgAdmin",
        endpoints: {
          home: "/",
          health: "/health", 
          database_health: "/health/db",
          statistics: "/api/tasks/stats",
          tasks: "/api/tasks",
          create_task: "POST /api/tasks",
          get_task: "GET /api/tasks/:id",
          update_task: "PUT /api/tasks/:id",
          delete_task: "DELETE /api/tasks/:id"
        },
        database_access: {
          pgAdmin: "http://localhost:5050",
          credentials: {
            email: "admin@taskapi.com",
            password: "admin123"
          }
        },
        documentation: "See README.md for full API documentation",
        status: "Server is running with PostgreSQL! 🐘"
      };
      
      sendSuccess(res, 200, welcomeData);
      return;
    }
    
    // Health check endpoint
    if (pathname === '/health' && method === 'GET') {
      const dbHealth = await db.healthCheck();
      const healthData = {
        status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0',
        database: dbHealth,
        services: {
          api: 'healthy',
          database: dbHealth.status,
          logging: fs.existsSync(logDir) ? 'healthy' : 'degraded'
        }
      };
      
      log('info', 'Health check requested', healthData);
      sendSuccess(res, 200, healthData);
      return;
    }

    // Database health check endpoint
    if (pathname === '/health/db' && method === 'GET') {
      const dbHealth = await db.healthCheck();
      const testConnection = await db.testConnection();
      
      const dbHealthData = {
        ...dbHealth,
        connection_test: testConnection,
        timestamp: new Date().toISOString()
      };
      
      const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
      sendSuccess(res, statusCode, dbHealthData);
      return;
    }

    // Get task statistics
    if (pathname === '/api/tasks/stats' && method === 'GET') {
      const stats = await Task.getStatistics();
      
      log('info', 'Task statistics retrieved', { stats });
      sendSuccess(res, 200, {
        statistics: stats,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Get all tasks
    if (pathname === '/api/tasks' && method === 'GET') {
      const { 
        status, 
        priority, 
        page = 1, 
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = parsedUrl.query;
      
      const result = await Task.findAll({ 
        status, 
        priority, 
        page: parseInt(page), 
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });
      
      log('info', 'Tasks retrieved', { 
        count: result.tasks.length,
        totalItems: result.pagination.totalItems,
        filters: result.filters 
      });
      
      sendSuccess(res, 200, result);
      return;
    }
    
    // Get single task
    if (pathname.startsWith('/api/tasks/') && method === 'GET') {
      const taskId = pathname.split('/')[3];
      
      if (taskId === 'stats') {
        return; // Already handled above
      }
      
      const task = await Task.findById(taskId);
      
      if (!task) {
        log('warn', 'Task not found', { taskId });
        sendError(res, 404, 'Task not found', `Task with ID ${taskId} does not exist`, 'TASK_NOT_FOUND');
        return;
      }
      
      log('info', 'Task retrieved', { taskId });
      sendSuccess(res, 200, { task: task.toJSON() });
      return;
    }
    
    // Create task
    if (pathname === '/api/tasks' && method === 'POST') {
      const body = await parseBody(req);
      
      // Validate input
      const validation = Task.validate(body);
      if (!validation.isValid) {
        log('warn', 'Task validation failed', { errors: validation.errors });
        sendError(res, 400, 'Validation failed', validation.errors.join(', '), 'VALIDATION_ERROR');
        return;
      }
      
      const { title, description, priority } = body;
      const newTask = await Task.create({ title, description, priority });
      
      log('info', 'Task created', { taskId: newTask.id, title: newTask.title });
      sendSuccess(res, 201, {
        message: 'Task created successfully',
        task: newTask.toJSON()
      });
      return;
    }
    
    // Update task
    if (pathname.startsWith('/api/tasks/') && method === 'PUT') {
      const taskId = pathname.split('/')[3];
      const body = await parseBody(req);
      
      // Validate input
      const validation = Task.validate(body);
      if (!validation.isValid) {
        log('warn', 'Task validation failed', { errors: validation.errors });
        sendError(res, 400, 'Validation failed', validation.errors.join(', '), 'VALIDATION_ERROR');
        return;
      }
      
      const updatedTask = await Task.updateById(taskId, body);
      
      if (!updatedTask) {
        log('warn', 'Task not found for update', { taskId });
        sendError(res, 404, 'Task not found', `Task with ID ${taskId} does not exist`, 'TASK_NOT_FOUND');
        return;
      }
      
      log('info', 'Task updated', { taskId });
      sendSuccess(res, 200, {
        message: 'Task updated successfully',
        task: updatedTask.toJSON()
      });
      return;
    }
    
    // Delete task
    if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
      const taskId = pathname.split('/')[3];
      
      const deletedTask = await Task.deleteById(taskId);
      
      if (!deletedTask) {
        log('warn', 'Task not found for deletion', { taskId });
        sendError(res, 404, 'Task not found', `Task with ID ${taskId} does not exist`, 'TASK_NOT_FOUND');
        return;
      }
      
      log('info', 'Task deleted', { taskId, title: deletedTask.title });
      sendSuccess(res, 200, {
        message: 'Task deleted successfully',
        task: deletedTask.toJSON()
      });
      return;
    }
    
    // 404 for unknown routes
    log('warn', 'Route not found', { path: pathname, method });
    sendError(res, 404, 'Route not found', `The endpoint ${method} ${pathname} does not exist`, 'ROUTE_NOT_FOUND');
    
  } catch (error) {
    log('error', 'Server error', { error: error.message, stack: error.stack });
    sendError(res, 500, 'Internal server error', 'An unexpected error occurred', 'INTERNAL_ERROR');
  }
});

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting server
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      log('error', 'Failed to connect to database. Server not started.');
      process.exit(1);
    }

    server.listen(PORT, () => {
      log('info', 'Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        database: 'PostgreSQL',
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 Task Management API running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🐘 Database health: http://localhost:${PORT}/health/db`);
      console.log(`📋 API endpoint: http://localhost:${PORT}/api/tasks`);
      console.log(`📈 Statistics: http://localhost:${PORT}/api/tasks/stats`);
      console.log(`🔧 pgAdmin: http://localhost:5050`);
    });
  } catch (error) {
    log('error', 'Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  log('info', `Received ${signal}, shutting down gracefully`);
  
  try {
    // Close database connections
    await db.closePool();
    
    // Close HTTP server
    server.close(() => {
      log('info', 'Server shutdown complete');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      log('error', 'Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    log('error', 'Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason: reason.toString(), promise });
  process.exit(1);
});

// Start the server
startServer();

module.exports = server;