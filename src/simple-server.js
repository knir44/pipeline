const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Simple in-memory storage for tasks
let tasks = [
  {
    id: '1',
    title: 'Sample Task',
    description: 'This is a sample task for demonstration',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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
        message: "🚀 Task Management API",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          tasks: "/api/tasks",
          create_task: "POST /api/tasks",
          get_task: "GET /api/tasks/:id",
          update_task: "PUT /api/tasks/:id",
          delete_task: "DELETE /api/tasks/:id"
        },
        documentation: "See README.md for full API documentation",
        status: "Server is running successfully! 🎉"
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(welcomeData, null, 2));
      return;
    }
    
    // Health check endpoint
    if (pathname === '/health' && method === 'GET') {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthData, null, 2));
      return;
    }
    
    // Get all tasks
    if (pathname === '/api/tasks' && method === 'GET') {
      const { status, priority, page = 1, limit = 10 } = parsedUrl.query;
      let filteredTasks = [...tasks];
      
      if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }
      if (priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === priority);
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
      
      const response = {
        tasks: paginatedTasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredTasks.length / limit),
          totalItems: filteredTasks.length,
          itemsPerPage: parseInt(limit)
        },
        filters: { status, priority }
      };
      
      log('info', 'Tasks retrieved', { count: paginatedTasks.length });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
      return;
    }
    
    // Get single task
    if (pathname.startsWith('/api/tasks/') && method === 'GET') {
      const taskId = pathname.split('/')[3];
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Task not found',
          message: `Task with ID ${taskId} does not exist`,
          code: 'TASK_NOT_FOUND'
        }));
        return;
      }
      
      log('info', 'Task retrieved', { taskId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ task }, null, 2));
      return;
    }
    
    // Create task
    if (pathname === '/api/tasks' && method === 'POST') {
      const body = await parseBody(req);
      const { title, description, priority = 'medium' } = body;
      
      if (!title || title.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Title is required',
          code: 'VALIDATION_ERROR'
        }));
        return;
      }
      
      const newTask = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description || '',
        status: 'pending',
        priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      
      log('info', 'Task created', { taskId: newTask.id, title: newTask.title });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Task created successfully',
        task: newTask
      }, null, 2));
      return;
    }
    
    // Update task
    if (pathname.startsWith('/api/tasks/') && method === 'PUT') {
      const taskId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { title, description, status, priority } = body;
      
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Task not found',
          message: `Task with ID ${taskId} does not exist`,
          code: 'TASK_NOT_FOUND'
        }));
        return;
      }
      
      const updatedTask = {
        ...tasks[taskIndex],
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        updatedAt: new Date().toISOString()
      };
      
      tasks[taskIndex] = updatedTask;
      
      log('info', 'Task updated', { taskId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Task updated successfully',
        task: updatedTask
      }, null, 2));
      return;
    }
    
    // Delete task
    if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
      const taskId = pathname.split('/')[3];
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Task not found',
          message: `Task with ID ${taskId} does not exist`,
          code: 'TASK_NOT_FOUND'
        }));
        return;
      }
      
      const deletedTask = tasks.splice(taskIndex, 1)[0];
      
      log('info', 'Task deleted', { taskId, title: deletedTask.title });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Task deleted successfully',
        task: deletedTask
      }, null, 2));
      return;
    }
    
    // 404 for unknown routes
    log('warn', 'Route not found', { path: pathname, method });
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Route not found',
      message: `The endpoint ${method} ${pathname} does not exist`,
      code: 'ROUTE_NOT_FOUND'
    }));
    
  } catch (error) {
    log('error', 'Server error', { error: error.message, stack: error.stack });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }));
  }
});

// Start server
server.listen(PORT, () => {
  log('info', 'Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🚀 Task Management API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API endpoint: http://localhost:${PORT}/api/tasks`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  log('info', `Received ${signal}, shutting down gracefully`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;