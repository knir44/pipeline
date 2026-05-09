const request = require('supertest');
const app = require('../src/server');

describe('Task Management API', () => {
  let taskId;

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('version');
    });
  });

  describe('Tasks API', () => {
    it('should get all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.tasks)).toBeTruthy();
    });

    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high'
      };

      const res = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('task');
      expect(res.body.task).toHaveProperty('id');
      expect(res.body.task.title).toBe(taskData.title);
      expect(res.body.task.status).toBe('pending');

      taskId = res.body.task.id;
    });

    it('should get a single task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(res.body).toHaveProperty('task');
      expect(res.body.task.id).toBe(taskId);
    });

    it('should update a task', async () => {
      const updateData = {
        title: 'Updated Test Task',
        status: 'in-progress',
        priority: 'medium'
      };

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('task');
      expect(res.body.task.title).toBe(updateData.title);
      expect(res.body.task.status).toBe(updateData.status);
    });

    it('should delete a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/tasks/non-existent-id')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('code', 'TASK_NOT_FOUND');
    });

    it('should validate task creation', async () => {
      const invalidTask = {
        title: '', // Empty title should fail
        priority: 'invalid-priority'
      };

      const res = await request(app)
        .post('/api/tasks')
        .send(invalidTask)
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      // Check for Helmet security headers
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS', async () => {
      const res = await request(app)
        .options('/api/tasks')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(res.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});