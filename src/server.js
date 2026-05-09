const express = require('express');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory storage (for minimal demo - in production use database)
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

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Simple validation helper
const validateTask = (req, res, next) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({
      error: 'Title is required',
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  logger.info('Health check requested', healthData);
  res.status(200).json(healthData);
});

// Get all tasks with pagination and filtering
app.get('/api/tasks', (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    let filteredTasks = [...tasks];

    // Apply filters
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

    logger.info('Tasks retrieved successfully', {
      count: paginatedTasks.length,
      filters: { status, priority },
      page
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error retrieving tasks', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve tasks',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get single task by ID
app.get('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = tasks.find(t => t.id === id);

    if (!task) {
      logger.warn('Task not found', { taskId: id });
      return res.status(404).json({
        error: 'Task not found',
        message: `Task with ID ${id} does not exist`,
        code: 'TASK_NOT_FOUND'
      });
    }

    logger.info('Task retrieved successfully', { taskId: id });
    res.status(200).json({ task });
  } catch (error) {
    logger.error('Error retrieving task', { error: error.message, taskId: req.params.id });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve task',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Create new task
app.post('/api/tasks', validateTask, (req, res) => {
  try {
    const { title, description, priority = 'medium' } = req.body;
    
    const newTask = {
      id: Date.now().toString(),
      title,
      description: description || '',
      status: 'pending',
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(newTask);

    logger.info('Task created successfully', {
      taskId: newTask.id,
      title: newTask.title,
      priority: newTask.priority
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    logger.error('Error creating task', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create task',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      logger.warn('Task not found for update', { taskId: id });
      return res.status(404).json({
        error: 'Task not found',
        message: `Task with ID ${id} does not exist`,
        code: 'TASK_NOT_FOUND'
      });
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      updatedAt: new Date().toISOString()
    };

    tasks[taskIndex] = updatedTask;

    logger.info('Task updated successfully', {
      taskId: id,
      changes: { title, description, status, priority }
    });

    res.status(200).json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    logger.error('Error updating task', { error: error.message, taskId: req.params.id });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update task',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      logger.warn('Task not found for deletion', { taskId: id });
      return res.status(404).json({
        error: 'Task not found',
        message: `Task with ID ${id} does not exist`,
        code: 'TASK_NOT_FOUND'
      });
    }

    const deletedTask = tasks.splice(taskIndex, 1)[0];

    logger.info('Task deleted successfully', {
      taskId: id,
      title: deletedTask.title
    });

    res.status(200).json({
      message: 'Task deleted successfully',
      task: deletedTask
    });
  } catch (error) {
    logger.error('Error deleting task', { error: error.message, taskId: req.params.id });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete task',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { path: req.originalUrl, method: req.method });
  res.status(404).json({
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Handle server errors
server.on('error', (err) => {
  logger.error('Server error', { error: err.message });
  process.exit(1);
});

module.exports = app;