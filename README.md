# Full Stack Multitenant SaaS Template

This template provides a foundational structure for a multitenant SaaS application.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or later (Detected path: `C:\apps\nodejs18`)
- **PostgreSQL**: A running instance (Configure in `.env` files)

### Setup
1. **Database**: Create a database named `saas_template`.
2. **Environment Variables**:
   - Copy `backend/.env.example` to `backend/.env` and update credentials.
   - Copy `middleware/.env.example` to `middleware/.env` and update credentials.
3. **Build**:
   - Run `build.bat` to install dependencies and build the projects.
4. **Seed**:
   - Run `cd backend && npm run seed` to populate initial plans and a super admin user.

### Running the App
- Run `run.bat` to start both the API and the Frontend.
- Run `open.bat` to launch the app in Microsoft Edge.

## 🏗️ Architecture

- **Backend**: TypeORM + PostgreSQL. Managed entities and migrations.
- **Middleware**: Express.js API. Handles authentication (JWT/Basic), tenant scoping, RBAC, and CRUD logic.
- **Frontend**: Vite + React + TypeScript + Tailwind CSS. Component-based UI with a dark-mode premium aesthetic.

## 🛠️ Features

- **Multitenancy**: Subdomain/Header-based isolation.
- **Authentication**: JWT-based session management with Basic Auth fallback.
- **Tenant Management**: Create and manage organizations.
- **Member Management**: Invite users, manage roles (Owner, Admin, Member, Viewer).
- **Billing**: Plan-based feature flags and subscriptions.
- **Item Management**: CRUD operations with a full **Revision History** and rollback system.
- **File Management**: Metadata-rich file storage support with soft deletes.
- **Audit Logging**: Platform-wide activity logging.
- **Notification System**: In-app notifications with read/unread status.

## 🔑 Default Credentials
- **Admin Email**: `admin@saas-template.com`
- **Admin Password**: `password123` (Hashed in DB, check `users.txt` for details)
