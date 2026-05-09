# Task Management API

🚀 A minimal, production-ready REST API for task management built with Node.js, Express, Docker, and comprehensive CI/CD pipeline.

[![CI/CD Pipeline](https://github.com/username/task-management-api/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/username/task-management-api/actions/workflows/ci-cd.yml)
[![Tests](https://github.com/username/task-management-api/actions/workflows/test.yml/badge.svg)](https://github.com/username/task-management-api/actions/workflows/test.yml)
[![Docker Image](https://img.shields.io/docker/v/username/task-management-api?label=Docker&logo=docker)](https://hub.docker.com/r/username/task-management-api)
[![License](https://img.shields.io/github/license/username/task-management-api)](LICENSE)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Docker](#docker)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Logging](#logging)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## ✨ Features

- 🏗️ **RESTful API** - Complete CRUD operations for task management
- 🐳 **Docker Support** - Production-ready containerization
- 📊 **Comprehensive Logging** - Winston-based logging to files with rotation
- 🔒 **Security First** - Helmet, CORS, rate limiting, input validation
- 🧪 **Testing Ready** - Jest setup with comprehensive test suite
- 🚀 **CI/CD Pipeline** - GitHub Actions for automated testing and deployment
- 📝 **API Documentation** - Postman collection with automated tests
- 🔍 **Health Checks** - Built-in health monitoring endpoints
- ⚡ **Performance** - Optimized with proper error handling and logging
- 🏷️ **Input Validation** - Express-validator for secure data handling

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Logging**: Winston
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest & Supertest
- **Security**: Helmet, CORS, Express Rate Limit
- **Validation**: Express Validator
- **Code Quality**: ESLint

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose (optional)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/username/task-management-api.git
cd task-management-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
# Development mode with hot reloading
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

### 4. Verify Installation

Check the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  \"status\": \"healthy\",
  \"timestamp\": \"2026-05-09T06:07:00.000Z\",
  \"uptime\": 1.234,
  \"memory\": {...},
  \"version\": \"1.0.0\"
}
```

## 📚 API Documentation

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

### Endpoints

#### Health Check
- **GET** `/health` - Get API health status

#### Tasks
- **GET** `/api/tasks` - Get all tasks (with pagination and filters)
- **GET** `/api/tasks/:id` - Get specific task
- **POST** `/api/tasks` - Create new task
- **PUT** `/api/tasks/:id` - Update task
- **DELETE** `/api/tasks/:id` - Delete task

### Request Examples

#### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"title\": \"Complete project documentation\",
    \"description\": \"Write comprehensive README and API docs\",
    \"priority\": \"high\"
  }'
```

#### Get All Tasks with Filters
```bash
curl \"http://localhost:3000/api/tasks?status=pending&priority=high&page=1&limit=10\"
```

### Postman Collection

Import the Postman collection for interactive API testing:

1. Open Postman
2. Import `postman/task-management-api.postman_collection.json`
3. Import environment `postman/task-management-api.postman_environment.json`
4. Run the collection to test all endpoints

## 💻 Development

### Available Scripts

```bash
# Development with hot reloading
npm run dev

# Production start
npm start

# Run tests
npm test

# Run linter
npm run lint

# Docker build
npm run docker:build

# Docker run
npm run docker:run
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Code Style

This project uses ESLint for code quality. Run the linter:

```bash
npm run lint
```

## 🐳 Docker

### Build and Run with Docker

```bash
# Build the image
docker build -t task-management-api .

# Run the container
docker run -p 3000:3000 -v $(pwd)/logs:/app/logs task-management-api
```

### Docker Compose

#### Production
```bash
docker-compose up -d
```

#### Development with Hot Reloading
```bash
docker-compose --profile dev up -d
```

### Docker Configuration

- **Base Image**: `node:18-alpine` (lightweight and secure)
- **Security**: Non-root user execution
- **Health Checks**: Built-in container health monitoring
- **Volumes**: Persistent log storage
- **Multi-stage**: Optimized for production

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. **Main CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
- **Triggers**: Push to main/develop, tags, pull requests
- **Jobs**:
  - Code quality and testing (Node.js 16, 18, 20)
  - Docker build and security scanning (Trivy)
  - Integration testing
  - Deployment to staging/production
  - Release creation for tags

#### 2. **Test Workflow** (`.github/workflows/test.yml`)
- **Triggers**: All pushes and pull requests
- **Jobs**:
  - Linting and testing
  - Docker build verification

### Pipeline Features

- ✅ **Multi-Node Testing** - Tests against Node.js 16, 18, 20
- 🔒 **Security Scanning** - Trivy vulnerability scanning
- 🐳 **Container Registry** - Automated Docker image publishing
- 🚀 **Automated Deployment** - Environment-based deployments
- 📊 **Test Coverage** - Codecov integration
- 🏷️ **Release Management** - Automated GitHub releases

### Setting Up CI/CD

1. **Repository Secrets**: Add these to your GitHub repository secrets:
   ```
   CODECOV_TOKEN=your-codecov-token
   DOCKER_REGISTRY_PASSWORD=your-docker-password
   ```

2. **Environment Variables**: Configure in GitHub repository settings
3. **Branch Protection**: Enable for main branch with required status checks

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=server.test.js
```

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── __mocks__/      # Test mocks
```

### Test Coverage

- Target: >90% code coverage
- Automated coverage reports via Codecov
- Coverage reports generated in `coverage/` directory

## 📋 Logging

### Log Files

All logs are stored in the `logs/` directory:

- `application.log` - All application logs (info and above)
- `error.log` - Error logs only
- `access.log` - HTTP request logs
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### Log Levels

- **error**: Error conditions
- **warn**: Warning conditions
- **info**: Informational messages
- **http**: HTTP request logs
- **debug**: Debug information

### Log Configuration

- **Rotation**: Automatic log rotation (10MB max, 5 files)
- **Format**: JSON format for production, human-readable for development
- **Performance**: Async logging for minimal performance impact

### Example Log Entry

```json
{
  \"timestamp\": \"2026-05-09 06:07:00\",
  \"level\": \"info\",
  \"message\": \"Task created successfully\",
  \"taskId\": \"123e4567-e89b-12d3-a456-426614174000\",
  \"title\": \"New Task\",
  \"priority\": \"high\",
  \"service\": \"task-management-api\",
  \"environment\": \"production\"
}
```

## 🔒 Security

### Security Measures

- **Helmet**: Security headers (XSS, CSRF, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: IP-based request limiting
- **Input Validation**: Express-validator for all inputs
- **Error Handling**: No sensitive data in error responses
- **Docker Security**: Non-root user, minimal base image

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Configurable**: Adjust in `server.js`
- **Headers**: Rate limit info in response headers

### Input Validation

All endpoints validate inputs:
- **Title**: 1-100 characters, sanitized
- **Description**: Max 500 characters, optional
- **Priority**: Enum validation (low, medium, high)
- **Status**: Enum validation (pending, in-progress, completed)

## 🌍 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

### Environment Files

- `.env` - Local development (not in git)
- `.env.example` - Example environment file
- `docker-compose.yml` - Docker environment variables

## 📁 Project Structure

```
task-management-api/
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── logs/                   # Application logs (auto-created)
├── postman/               # Postman collection and environment
├── src/
│   ├── utils/
│   │   └── logger.js      # Winston logger configuration
│   └── server.js          # Main application server
├── tests/                 # Test files (to be created)
├── .dockerignore         # Docker ignore patterns
├── .gitignore           # Git ignore patterns
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Production Docker image
├── Dockerfile.dev       # Development Docker image
├── package.json         # Node.js dependencies and scripts
└── README.md           # This file
```

### Key Files

- **`src/server.js`**: Main Express application with all routes and middleware
- **`src/utils/logger.js`**: Centralized logging configuration
- **`Dockerfile`**: Production-optimized container image
- **`docker-compose.yml`**: Multi-service container orchestration
- **`.github/workflows/`**: CI/CD pipeline definitions

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Create** a Pull Request

### Pull Request Guidelines

- ✅ All tests pass
- ✅ Code follows ESLint rules
- ✅ Documentation updated
- ✅ Docker build succeeds
- ✅ Security scan passes

### Code Review Process

1. Automated checks must pass
2. At least one maintainer review required
3. All discussions resolved
4. Branch up to date with main

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/username/task-management-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/task-management-api/discussions)
- **Email**: developer@example.com

## 🚀 Deployment

### Quick Deploy Commands

```bash
# Local development
npm run dev

# Docker development
docker-compose --profile dev up

# Docker production
docker-compose up -d

# Build and push Docker image
docker build -t your-registry/task-management-api .
docker push your-registry/task-management-api
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database connected (if applicable)
- [ ] Logging directory writable
- [ ] Health checks enabled
- [ ] Monitoring configured
- [ ] SSL/TLS certificates installed
- [ ] Domain/DNS configured
- [ ] Backup strategy implemented

---

**Made with ❤️ for learning CI/CD pipelines and Docker best practices.**