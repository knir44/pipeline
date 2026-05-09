const db = require('../database/db');

class Task {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description || '';
    this.status = data.status || 'pending';
    this.priority = data.priority || 'medium';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new task
  static async create({ title, description = '', priority = 'medium' }) {
    try {
      const query = `
        INSERT INTO tasks (title, description, priority)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await db.query(query, [title.trim(), description.trim(), priority]);
      return new Task(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  // Find all tasks with filters and pagination
  static async findAll({ 
    status = null, 
    priority = null, 
    page = 1, 
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = {}) {
    try {
      let whereClause = '';
      let queryParams = [];
      let paramCount = 0;

      // Build WHERE clause
      const conditions = [];
      
      if (status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        queryParams.push(status);
      }

      if (priority) {
        paramCount++;
        conditions.push(`priority = $${paramCount}`);
        queryParams.push(priority);
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Validate sort parameters
      const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'priority'];
      const validSortOrders = ['ASC', 'DESC'];
      
      if (!validSortColumns.includes(sortBy)) {
        sortBy = 'created_at';
      }
      
      if (!validSortOrders.includes(sortOrder.toUpperCase())) {
        sortOrder = 'DESC';
      }

      // Count total items for pagination
      const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const totalItems = parseInt(countResult.rows[0].total);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(totalItems / limit);

      // Main query with pagination
      const dataQuery = `
        SELECT * FROM tasks 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const result = await db.query(dataQuery, queryParams);

      return {
        tasks: result.rows.map(row => new Task(row)),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: { status, priority },
        sorting: { sortBy, sortOrder }
      };
    } catch (error) {
      throw new Error(`Failed to retrieve tasks: ${error.message}`);
    }
  }

  // Find task by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM tasks WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Task(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find task: ${error.message}`);
    }
  }

  // Update a task
  static async updateById(id, updates = {}) {
    try {
      const allowedUpdates = ['title', 'description', 'status', 'priority'];
      const updateFields = [];
      const queryParams = [];
      let paramCount = 0;

      // Build SET clause
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key) && value !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          queryParams.push(typeof value === 'string' ? value.trim() : value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      queryParams.push(id);

      const query = `
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Task(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  // Delete a task
  static async deleteById(id) {
    try {
      const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Task(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  // Get task statistics
  static async getStatistics() {
    try {
      const query = 'SELECT * FROM task_statistics';
      const result = await db.query(query);
      
      return result.rows[0] || {
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        high_priority_tasks: 0,
        medium_priority_tasks: 0,
        low_priority_tasks: 0,
        completion_percentage: 0
      };
    } catch (error) {
      throw new Error(`Failed to get task statistics: ${error.message}`);
    }
  }

  // Validate task data
  static validate(data) {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required and cannot be empty');
    }

    if (data.title && data.title.trim().length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (data.description && data.description.length > 5000) {
      errors.push('Description must be less than 5000 characters');
    }

    if (data.status && !['pending', 'in-progress', 'completed'].includes(data.status)) {
      errors.push('Status must be one of: pending, in-progress, completed');
    }

    if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
      errors.push('Priority must be one of: low, medium, high');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Instance method to save the task
  async save() {
    try {
      if (this.id) {
        // Update existing task
        const updated = await Task.updateById(this.id, {
          title: this.title,
          description: this.description,
          status: this.status,
          priority: this.priority
        });
        return updated;
      } else {
        // Create new task
        const created = await Task.create({
          title: this.title,
          description: this.description,
          priority: this.priority
        });
        return created;
      }
    } catch (error) {
      throw new Error(`Failed to save task: ${error.message}`);
    }
  }

  // Instance method to delete the task
  async delete() {
    if (!this.id) {
      throw new Error('Cannot delete task without ID');
    }
    return await Task.deleteById(this.id);
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }
}

module.exports = Task;