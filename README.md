# HOSTEL360 – Complete Smart Hostel Management System

HOSTEL360 is an enterprise-grade Smart Hostel Management System engineered with a pure, traditional **MERN stack** (MongoDB, Express.js, React.js, Node.js) in **modern JavaScript (ES6+)**.

---

## 1. System Technology Stack

- **Frontend**: React 18, JavaScript (ES6+), Vite, Tailwind CSS, Recharts, React Router DOM v7, Axios, Lucide React
- **Backend**: Node.js, Express.js (REST API Architecture), JavaScript (ES6+), Mongoose ODM, JWT Authentication, bcryptjs, Multer, dotenv, cors
- **Database**: MongoDB with automatic fallback to embedded in-memory database engine for frictionless local development
- **Architecture**: Role-Based Access Control (RBAC) separating **Admin**, **Warden**, and **Student** scopes

---

## 2. Default Seeded Credentials

When launching the system, baseline accounts and hostel blocks are automatically prepared:

| Role | Email | Password | Scope & Permissions |
| --- | --- | --- | --- |
| **Admin** | `admin@hostel360.dev` | `Admin@Hostel360` | Full administrative control across all blocks, staff accounts, rooms, finance, reports, and system settings. |
| **Warden** | `warden@hostel360.dev` | `Warden@Hostel360` | Scoped strictly to assigned hostel blocks (`B-A` Nilgiri Boys Block). Can approve leaves, manage rooms, verify gate movements, resolve complaints, and post circulars. |
| **Student** | `student@hostel360.dev` | `Student@Hostel360` | Restricted to personal accommodation, simulated fee payments, leave applications, single-use gate QR passes, room directory, and messaging. |

*Additional seeded resident student accounts:*
- `aarav.sharma@hostel360.dev` (`Student@Hostel360`)
- `diya.patel@hostel360.dev` (`Student@Hostel360`)
- `kabir.singh@hostel360.dev` (`Student@Hostel360`)
- `meera.nair@hostel360.dev` (`Student@Hostel360`)
- `ishaan.rao@hostel360.dev` (`Student@Hostel360`)

---

## 3. Project Directory Structure

```
HostelOS/
│
├── frontend/                     # Pure React.js (ES6+ / Vite)
│   ├── public/
│   ├── src/
│   │   ├── auth/                 # Auth pages, protected routes, context
│   │   ├── components/           # Common UI: StatCard, DataTable, Modal, Panel, Icons
│   │   ├── context/              # AuthContext (React Context API)
│   │   ├── data/                 # Role navigation & schema definitions
│   │   ├── features/
│   │   │   ├── complaints/       # Complaint logging & status audit
│   │   │   ├── finance/          # Fee ledger, simulated payment, receipt modal
│   │   │   └── management/       # Student CRUD, Blocks, Rooms, Bed Allocations
│   │   ├── lib/                  # Axios HTTP client with JWT interceptor
│   │   ├── pages/
│   │   │   ├── admin/            # Staff & warden management
│   │   │   ├── common/           # Leaves, Gate, Visitors, Maintenance, Announcements, SOS, Mess, Feedback, Chat, Reports, Settings, Notifications
│   │   │   ├── student/          # Roommate directory, Outing passes, QR pass, Movement log, Visitor desk, Handbook
│   │   │   ├── AdminCharts.jsx   # Recharts live metrics
│   │   │   └── Dashboards.jsx    # Real-time MongoDB dashboards for Admin, Warden, Student
│   │   ├── App.jsx               # Client-side router mapping all operational routes
│   │   ├── index.css             # Tailwind CSS & UI styling
│   │   └── main.jsx              # React DOM entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Pure Node.js & Express.js (ES6+)
│   ├── src/
│   │   ├── auth/                 # JWT token utilities
│   │   ├── config/               # MongoDB Mongoose connection with embedded fallback
│   │   ├── middleware/           # authenticate & authorize RBAC middleware
│   │   ├── models/               # MongoDB Schemas (User, Student, Block, Room, Payment, Complaint, LeaveRequest, QRPass, GateMovement, Visitor, MaintenanceTask, Announcement, EmergencyAlert, MessMenu, Feedback, Message, Notification, AllocationHistory)
│   │   ├── routes/               # REST API endpoints
│   │   ├── scripts/              # Seed scripts & database test pings
│   │   ├── services/             # Bed allocation & room capacity service
│   │   ├── utils/                # HTTP error handlers & helpers
│   │   ├── app.js                # Express app configuration & route mounting
│   │   └── server.js             # HTTP server listener
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── package.json
└── README.md
```

---

## 4. Setup & Running the Application

### 1. Installation
Run from root:
```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

### 2. Launch Development Mode
Run both Frontend & Backend concurrently:
```bash
npm run dev
```

Or run each service individually:
- **Backend API**:
  ```bash
  npm run backend
  # Starts on http://localhost:5000
  # Health Check: http://localhost:5000/api/health
  ```
- **Frontend SPA**:
  ```bash
  npm run frontend
  # Starts on http://localhost:3000
  ```

### 3. Production Build
```bash
npm run build
```

---

## 5. Key Implemented Features

1. **Dashboard & Analytics**:
   - Real-time MongoDB aggregations for occupancy, revenue, pending fees, open complaints, student inside/outside counts, and visitor stats.
   - Interactive Recharts for fee collection trends, block capacity, and complaint distributions.
2. **User & Staff Management**:
   - Create, edit, activate/deactivate Admin and Warden accounts.
   - Assign wardens to specific hostel blocks with strict security scoping.
   - Secure password resets.
3. **Hostel Blocks & Room Management**:
   - Block capacity enforcement, floor and room creation, bed allocations, room vacating, and room-to-room student transfers with audit history logging.
4. **Fee Management & Simulated Payments**:
   - Fee structures for Accommodation, Mess, Security Deposit, and Amenities.
   - Online payment simulation with instant receipt generation, payment history, and printable vouchers.
5. **Complaints System**:
   - Track complaints through pending, assigned, in-progress, and resolved stages with internal staff audit trails.
6. **Student Leaves & Gate Pass**:
   - Multi-category leaves (Local Outing, Home Visit, Emergency Leave).
   - Warden/Admin approval with remarks triggers single-use **Digital QR Pass** tokens.
   - Student QR Pass visual screen and Gate Sentinel pass verification form.
7. **Gate Management & Resident Tracking**:
   - Real-time Inside vs. Outside resident counts with toggle roster tabs.
   - Scan/verify pass tokens and record movement transitions (ENTRY / EXIT).
8. **Visitor Desk**:
   - Pre-register guests, issue visitor pass tokens, check-in and check-out tracking.
9. **Facility Maintenance**:
   - Work orders for plumbing, electrical, carpentry, civil, HVAC, and cleaning with priority, deadline, and completion notes.
10. **Emergency SOS Distress System**:
    - High-priority student SOS broadcast with campus location description.
    - Instant distress alerts delivered to wardens and administrators with acknowledgement and resolution workflows.
11. **Mess & Dining Management**:
    - Weekly dining schedule (Breakfast, Lunch, Dinner) across all 7 days.
    - Editable dishes by staff and student meal rating submissions.
12. **Student-Warden Messaging**:
    - Direct messaging inbox between residents and their assigned hostel warden.
13. **Exportable Reports**:
    - Live data tables with CSV download and Printable views for Occupancy, Students, Fees, Complaints, Leaves, Visitors, Gate, and Maintenance.
