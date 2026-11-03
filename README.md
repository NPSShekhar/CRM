# Enterprise CRM & Customer Support Ticketing Platform

A production-ready, omnichannel **Customer Relationship Management (CRM) & Support Ticketing Platform** engineered with a scalable SaaS architecture. Connect multiple client products/applications (e.g., SkillBridge, Wings, BizOne, Susruta Hospital) into a unified support hub featuring two-way email integration, automatic thread detection, intelligent agent workload assignment, and real-time SLA metrics.

---

## Architecture Overview

```text
  Customer Channels (Email / Portal / WhatsApp Ready)
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway & Auth                   │
│   (JWT Session • RBAC: SuperAdmin / Admin / Agent)      │
└────────────┬───────────────────────────────┬────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Two-Way Email Engine  │     │   Omnichannel Ticketing │
│ • Idempotent Ingestion  │     │ • Sequential CRM-XXXXXX │
│ • Thread Header Matching│     │ • Auto-Assignment Engine│
│ • Normalized Customers  │     │ • Internal Staff Notes  │
│ • Outgoing SMTP Tracker │     │ • Multi-App Association │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│             PostgreSQL Database (Prisma ORM)            │
│  Users • Agents • Teams • Customers • Applications     │
│  Tickets • Messages • EmailMessages • AuditLogs         │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js v24+
- **Language**: TypeScript (Strict Mode enabled)
- **Framework**: Express.js REST APIs
- **ORM**: Prisma ORM with PostgreSQL
- **Security & Headers**: Helmet, CORS, Express-Rate-Limit, BCrypt password hashing, JWT
- **Email & Parsing**: Nodemailer, Mailparser, RFC 822/2822 header threading
- **File Storage**: Multer with MIME verification and size caps
- **Testing**: Vitest with Supertest E2E integration test suite

### Frontend
- **Framework**: React 18+ with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS with enterprise styling & Lucide React icons
- **Routing**: React Router DOM (Protected routes & RBAC guards)
- **Server State**: TanStack Query (React Query v5) with automated cache invalidation
- **Analytics Charts**: Recharts responsive visualization suite

---

## User Roles & Permissions

| Role | Portal & Redirection | Permissions |
|---|---|---|
| **SUPER_ADMIN** | `/admin/overview` | Complete control: organization management, applications, agents, teams, customers, tickets, SMTP settings, routing rules, audit logs |
| **ADMIN** | `/admin/overview` | Organization management, tickets, customers, applications, agents, teams, reports and workload management |
| **SUPPORT_MANAGER** | `/admin/overview` | Tickets, customers, applications, agents, teams, reports, workload and escalation management |
| **AGENT** | `/agent/workload` | Dedicated Agent Portal: My Workload, My Tickets, Customers, Applications, Conversations, direct customer email reply, internal notes |
| **CUSTOMER** | Customer Portal | View own tickets, submit new inquiries, confirm resolution, reopen issues |

---

## Two Distinct Portals (Admin vs Agent)

The system features two completely separated portal experiences backed by strict server-side RBAC authorization:

### 1. Admin Portal (`/admin/*`)
Accessible by: `SUPER_ADMIN`, `ADMIN`, `SUPPORT_MANAGER`
- **Overview (`/admin/overview`)**: 13 real-time KPI cards (Total Customers, Total Applications, Open Tickets, Pending Tickets, Unassigned Tickets, Resolved Tickets, Closed Tickets, Tickets Today, Tickets This Week, Average Response Time, Average Resolution Time, SLA At Risk, SLA Breached) and 8 interactive charts.
- **Tickets (`/admin/tickets`)**: Organization-wide ticket queue, triage, assignment, priority and status updates.
- **Customers (`/admin/customers`)**: Multi-application customer records, connected products, and ticket history.
- **Applications (`/admin/applications`)**: Connected product management (BizOne, SkillBridge, Susruta Hospital, Wings).
- **Agents (`/admin/agents`)**: Agent capacity, workload, and performance tracking.
- **Teams (`/admin/teams`)**: Department and escalation team definitions.
- **Reports (`/admin/reports`)**: SLA, agent performance, customer satisfaction, and volume analytics.
- **Email Simulator (`/admin/email-simulator`)**: Testing tool for simulating incoming customer emails and replies with full ingestion pipeline verification.
- **Settings (`/admin/settings`)**: SMTP server configuration and automated assignment rules.

### 2. Agent Portal (`/agent/*`)
Accessible by: `AGENT`
- **My Workload (`/agent/workload`)**: Dedicated workload dashboard answering *"What support work does this agent need to handle right now?"* Shows My Open Tickets, New Assignments, In Progress, Waiting for Customer, Urgent Tickets, SLA At Risk, SLA Breached, Resolved Today, and Immediate Action queue.
- **My Tickets (`/agent/tickets`)**: Tabbed interface featuring My Assigned Tickets, Unassigned Queue (for claiming), and All Organization Tickets (governed by backend permissions).
- **Customers (`/agent/customers`)**: Permitted customer directory and history.
- **Applications (`/agent/applications`)**: Permitted application context.
- **Access Control**: Agents cannot access `/admin/*` routes; navigation attempts are blocked with 403 Forbidden / Access Denied.

---

## Default Development Credentials

Pre-configured in database seed (`npm run db:seed`):

| Role | Email | Password | Assigned Application / Focus |
|---|---|---|---|
| **Super Admin** | `admin@crm.local` | `Admin@123` | Global Administration |
| **Support Manager** | `elena.manager@crm.local` | `Admin@123` | Tier 1 & Enterprise Teams |
| **Agent Ravi** | `ravi@crm.local` | `Agent@123` | SkillBridge & Authentication |
| **Agent Priya** | `priya@crm.local` | `Agent@123` | Susruta Hospital & Enterprise SLA |
| **Agent Arjun** | `arjun@crm.local` | `Agent@123` | BizOne & Wings Operations |
| **Customer John** | `john@example.com` | `Customer@123` | Apex Learning Group |

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js >= 18.x (tested on v24.x)
- PostgreSQL running locally or in Docker

### 2. Environment Configuration
Copy `.env.example` to `backend/.env` (configured for local PostgreSQL):

```env
DATABASE_URL="postgresql://postgres:Chandra@123@localhost:5432/crm_db"
PORT=5000
NODE_ENV=development
API_URL="http://localhost:5000"
APP_URL="http://localhost:5173"
JWT_SECRET="super-secure-crm-secret-key-production-ready-2026"
JWT_EXPIRES_IN="7d"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM_EMAIL="support@crm.local"
SMTP_FROM_NAME="Enterprise CRM Support"
UPLOAD_DIR="uploads"
MAX_FILE_SIZE_MB=10
```

### 3. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```

### 4. Database Push & Seeding
```bash
# Push schema to PostgreSQL database
npm run db:push

# Populate database with demo admin, agents, teams, applications, and sample tickets
npm run db:seed
```

### 5. Run Development Servers
Start both the backend API and frontend Vite client simultaneously with a single command:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Backend server (http://localhost:5000)
npm run dev:backend

# Frontend Vite client (http://localhost:5173)
npm run dev:frontend
```

---

## Running Automated Tests

A comprehensive integration test suite verifies authentication, customer deduplication, ticket assignment, and email threading:

```bash
npm run test
```

### Test Coverage Highlights
- ✅ **Authentication**: JWT token verification and user profile loading
- ✅ **Customer Deduplication**: Email normalization and duplicate email prevention
- ✅ **Auto-Assignment**: Round-robin and load-based agent assignment
- ✅ **Email Ingestion**: Automatic customer and ticket creation from inbound email
- ✅ **Idempotency Protection**: Duplicate provider Message-ID detection
- ✅ **Email Threading (Section 46 Requirement)**:
  - Email #1 (`john@example.com` -> `support@skillbridge.com`): creates `CRM-000001`
  - Email #2 (`agent@crm.com` -> `Re: [CRM-000001]`): detected as same conversation
  - Email #3 (`john@example.com` -> `Re: [CRM-000001]`): detected as same conversation
  - **Result: 1 Ticket, 3 Messages (Zero duplicate tickets)**
- ✅ **Internal Notes**: Staff notes strictly isolated from customer email delivery
- ✅ **Status & SLA**: Resolution timestamps and automated status updates

---

## Two-Way Email Ingestion & Threading Architecture

### Inbound Email Pipeline:
1. **Webhook / Receiver**: Email arrives at `/api/email/incoming` with sender, recipient, subject, body, and MIME headers (`Message-ID`, `In-Reply-To`, `References`).
2. **Idempotency Check**: If `providerMessageId` was already stored in `EmailMessage`, the webhook returns HTTP 200 immediately without duplicating tickets or messages.
3. **Thread Detection**:
   - Step A: Matches `inReplyTo` header against previous `EmailMessage.providerMessageId`.
   - Step B: Matches `references` header against past message IDs.
   - Step C: Regex extraction of CRM Ticket Tag in subject: `[CRM-XXXXXX]` or `CRM-XXXXXX`.
4. **Existing Thread Matched**:
   - Appends customer message to the existing ticket conversation.
   - Automatically transitions status from `WAITING_FOR_CUSTOMER` or `RESOLVED` back to `IN_PROGRESS`.
   - Sends notification to the assigned agent.
5. **New Thread**:
   - Normalizes customer email address (looks up existing or auto-creates customer `CUST-XXXXXX`).
   - Identifies application via recipient support email address (e.g. `support@skillbridge.com`).
   - Generates sequential ticket ID `CRM-XXXXXX`.
   - Invokes automatic agent assignment engine.

### Outbound Agent Reply Pipeline:
1. Agent replies directly within the CRM ticket composer.
2. Subject automatically includes `[CRM-XXXXXX] Original Subject`.
3. Sets outgoing `Message-ID`, `In-Reply-To`, and `References` headers.
4. If SMTP delivery fails, message status is saved as `FAILED` with retry capability.

---

## WhatsApp Integration Architecture (Section 26)

All channels (Email, WhatsApp, Web, Customer Portal) share the unified schema:
- `Ticket.source`: `EMAIL | WHATSAPP | WEB | CUSTOMER_PORTAL`
- `TicketMessage.source`: `EMAIL | WHATSAPP | WEB | CUSTOMER_PORTAL`
- Customer phone number is normalized and indexed.
- Incoming WhatsApp webhook payload maps directly to `ConversationService.addMessage` without modifying database models.

---

## Production Build

```bash
# Compiles backend TypeScript to /backend/dist and frontend bundle to /frontend/dist
npm run build
```
