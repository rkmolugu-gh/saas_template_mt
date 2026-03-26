# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multitenant SaaS starter template with tenant isolation, user management, RBAC, and billing integration. See `prd.md` for full requirements.

## Architecture

Three-layer architecture:
- **backend/** - TypeORM entities, database connection, migrations, and seed data
- **middleware/** - Express API server with authentication and route handlers
- **frontend/** - Vite + React + TypeScript + Tailwind CSS SPA

### Database
- PostgreSQL with TypeORM ORM
- Row-level tenant isolation via `tenant_id` columns
- Connection configured via environment variables (see `.env.example`)

### Authentication
- JWT-based authentication with bcryptjs password hashing
- Tokens stored in localStorage, attached via Authorization header
- Tenant context passed via `x-tenant-id` header

## Development Commands

### Install dependencies
```bash
cd backend && npm install
cd middleware && npm install
cd frontend && npm install
```

### Environment setup
Copy `.env.example` to `.env` in both `backend/` and `middleware/` directories.

### Database setup
```bash
cd backend
npm run migration:run   # Run migrations
npm run seed            # Seed initial data
```

### Start development servers
```bash
# Terminal 1 - Frontend (port 5173)
cd frontend && npm run dev

# Terminal 2 - Middleware API (port 3001)
cd middleware && npm run dev
```

### Build
```bash
cd backend && npm run build
cd middleware && npm run build
cd frontend && npm run build
```

## Key Files

- `backend/src/entities/` - TypeORM entity definitions
- `backend/src/data-source.ts` - Database connection configuration
- `backend/src/seed.ts` - Database seeding script
- `middleware/src/index.ts` - Express app entry point with route mounting
- `middleware/src/routes/` - API route handlers
- `middleware/src/middleware/auth.ts` - JWT authentication middleware
- `frontend/src/App.tsx` - React Router configuration
- `frontend/src/hooks/useAuth.tsx` - Authentication context and hooks
- `frontend/src/lib/api.ts` - Axios instance with auth interceptors

## Roles

Five fixed roles (see `prd.md` for capabilities):
- Super Admin - Platform-wide access
- Tenant Owner - Full tenant control
- Admin - Member/settings management
- Member - CRUD on tenant data
- Viewer - Read-only access

## Routing

Frontend routes defined in `App.tsx`:
- `/login`, `/signup` - Public routes
- `/dashboard`, `/items`, `/files`, `/members`, `/billing`, `/notifications`, `/settings`, `/admin` - Protected routes

API routes mounted under `/api`:
- `/api/auth/*` - Authentication endpoints
- `/api/tenants/*` - Tenant management
- `/api/members/*` - Member management
- `/api/items/*` - Item CRUD with revisions
- `/api/files/*` - File uploads
- `/api/plans/*` - Subscription plans
- `/api/notifications/*` - User notifications
- `/api/audit-logs/*` - Audit trail
- `/api/admin/*` - Super admin operations
