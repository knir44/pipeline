# 🐘 Database Setup - PostgreSQL with pgAdmin

## 📋 Overview

This project uses **PostgreSQL** as the database with **pgAdmin** for database management, all running in Docker containers.

## 🚀 Quick Start

### Option 1: With Docker (Recommended)

```bash
# Start all services (API + Database + pgAdmin)
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down -v
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start only database services
docker-compose up -d postgres pgadmin

# Run API locally
npm run dev
```

## 🔧 Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **API** | 3000 | http://localhost:3000 | Task Management API |
| **PostgreSQL** | 5432 | localhost:5432 | Database Server |
| **pgAdmin** | 5050 | http://localhost:5050 | Database Management UI |

## 🗃️ Database Configuration

### Connection Details

```bash
Host: localhost (or 'postgres' within Docker)
Port: 5432
Database: taskmanagement
Username: taskuser
Password: taskpass123
```

### pgAdmin Access

- **URL**: http://localhost:5050
- **Email**: admin@taskapi.com
- **Password**: admin123

## 📊 Database Schema

### Tasks Table

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT DEFAULT '',
    status task_status DEFAULT 'pending' NOT NULL,
    priority task_priority DEFAULT 'medium' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### Enums

```sql
CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
```

## 🎯 API Endpoints

### Health Checks
- `GET /health` - General health check
- `GET /health/db` - Database health check

### Statistics
- `GET /api/tasks/stats` - Task statistics

### Tasks CRUD
- `GET /api/tasks` - List all tasks (with pagination & filters)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## 📈 Sample Requests

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Implement PostgreSQL",
    "description": "Add database support to the API",
    "priority": "high"
  }'
```

### Get Tasks with Filters
```bash
curl "http://localhost:3000/api/tasks?status=pending&priority=high&page=1&limit=5"
```

### Get Statistics
```bash
curl http://localhost:3000/api/tasks/stats
```

## 🔍 Database Management

### Using pgAdmin

1. **Access pgAdmin**: http://localhost:5050
2. **Login** with credentials above
3. **Add Server**:
   - Name: `Task Management DB`
   - Host: `postgres` (within Docker) or `localhost` (from outside)
   - Port: `5432`
   - Database: `taskmanagement`
   - Username: `taskuser`
   - Password: `taskpass123`

### Direct SQL Access

```bash
# Connect via Docker
docker exec -it task-management-postgres psql -U taskuser -d taskmanagement

# Or using psql directly (if installed)
psql -h localhost -p 5432 -U taskuser -d taskmanagement
```

## 🗂️ Sample Queries

### View All Tasks
```sql
SELECT * FROM tasks ORDER BY created_at DESC;
```

### Task Statistics
```sql
SELECT * FROM task_statistics;
```

### Tasks by Status
```sql
SELECT status, COUNT(*) as count 
FROM tasks 
GROUP BY status;
```

### High Priority Pending Tasks
```sql
SELECT * FROM tasks 
WHERE priority = 'high' AND status = 'pending'
ORDER BY created_at DESC;
```

## 🔄 Database Operations

### Reset Database
```bash
# Stop and remove all containers + volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Backup Database
```bash
# Create backup
docker exec task-management-postgres pg_dump -U taskuser taskmanagement > backup.sql

# Restore backup
docker exec -i task-management-postgres psql -U taskuser -d taskmanagement < backup.sql
```

### View Logs
```bash
# API logs
docker-compose logs -f task-api

# Database logs
docker-compose logs -f postgres

# pgAdmin logs
docker-compose logs -f pgadmin
```

## 🚨 Troubleshooting

### Database Connection Issues

1. **Check if PostgreSQL is running**:
   ```bash
   docker ps | grep postgres
   ```

2. **Check database logs**:
   ```bash
   docker-compose logs postgres
   ```

3. **Test connection**:
   ```bash
   curl http://localhost:3000/health/db
   ```

### pgAdmin Issues

1. **Reset pgAdmin data**:
   ```bash
   docker-compose down
   docker volume rm pipeline_pgadmin_data
   docker-compose up -d
   ```

2. **Access pgAdmin logs**:
   ```bash
   docker-compose logs pgadmin
   ```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the ports
netstat -tulpn | grep :5432
netstat -tulpn | grep :5050
netstat -tulpn | grep :3000

# Kill processes or change ports in docker-compose.yml
```

## 🏗️ Development Notes

### Environment Variables

```bash
# Database connection
DB_HOST=postgres          # Use 'localhost' for local development
DB_PORT=5432
DB_NAME=taskmanagement
DB_USER=taskuser
DB_PASSWORD=taskpass123

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### Database Migrations

For future schema changes, consider adding:
- Migration scripts in `/database/migrations/`
- Version control for database schema
- Automated migration runner

## 📚 Useful Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **pgAdmin Documentation**: https://www.pgadmin.org/docs/
- **Docker Compose Reference**: https://docs.docker.com/compose/

---

**🎉 Your PostgreSQL setup is complete!** 

The database is now persistent, scalable, and ready for production use with proper indexing, constraints, and statistics views.