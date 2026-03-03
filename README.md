# Spenca DSR — Sales & Factory Management PWA

A **mobile-first Progressive Web App (PWA)** built for Spenca Mineral Water to manage daily sales reporting, factory inventory, production, dispatch, and telecalling operations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Templating | EJS |
| Auth | bcrypt + express-session (stored in MongoDB) |
| File Storage | Oracle OCI Object Storage |
| Styling | Tailwind CSS + Custom CSS |
| Charts | Chart.js |
| Icons | Lucide Icons |

---

## User Roles & Access

| Role | Login Lands On | Description |
|---|---|---|
| `sysadmin` | `/sysadmin/dashboard` | Full system access — manage users & products |
| `headoffice` | `/headoffice/dashboard` | View orders, stock, production history, TeleCRM, IMS |
| `owner` | `/owner/dashboard` | Analytics, charts, sales reports |
| `salesperson` | `/salesperson/dashboard` | Create orders, view order history, reminders |
| `factory_incharge` | `/factory-incharge/stock/raw-materials` | Record inward, production, dispatch; view stock |

> Passwords are bcrypt-hashed. Default admin: `admin@example.com` / `Admin@123` (change immediately after first login).

---

## Project Structure

```
spenca_dsr/
├── config/
│   └── database.js              # MongoDB Atlas connection
│
├── controllers/
│   ├── authController.js        # Login, logout, role-based redirect
│   ├── factoryInchargeController.js  # Inward, production, dispatch, stock
│   ├── headofficeController.js  # Dashboard, IMS, TeleCRM, reports
│   ├── ownerController.js       # Analytics & sales stats APIs
│   ├── salespersonController.js # Orders, customers, reminders
│   ├── sysadminController.js    # User & product management
│   └── telecrmController.js     # Device registration, call logs, campaigns
│
├── middleware/
│   ├── auth.js                  # isAuthenticated middleware
│   └── roleCheck.js             # checkRole(roles[]) middleware
│
├── models/
│   ├── CallLog.js               # TeleCRM call log entries
│   ├── Campaign.js              # TeleCRM campaign definitions
│   ├── CampaignContact.js       # Contacts within a campaign
│   ├── Customer.js              # Customer directory
│   ├── Device.js                # Registered Android devices (TeleCRM)
│   ├── Dispatch.js              # Finished goods dispatch records
│   ├── Inward.js                # Raw material inward records
│   ├── Order.js                 # Sales orders
│   ├── Product.js               # Products (Raw Material & Finished Good)
│   ├── Production.js            # Production batch records
│   ├── Supplier.js              # Supplier directory
│   └── User.js                  # App users (all roles)
│
├── public/
│   ├── css/                     # Compiled Tailwind CSS
│   ├── js/
│   │   ├── autocomplete.js      # Reusable autocomplete widget
│   │   ├── charts.js            # Chart.js helpers
│   │   ├── fab.js               # FAB menu toggle logic
│   │   └── gps.js               # GPS/geolocation helper
│   ├── uploads/                 # Local product photo uploads (sysadmin)
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker for offline support
│
├── routes/
│   ├── api.js                   # /api/* — autocomplete & owner stats
│   ├── auth.js                  # /login, /logout, / redirect
│   ├── factoryIncharge.js       # /factory-incharge/*
│   ├── headoffice.js            # /headoffice/*
│   ├── owner.js                 # /owner/*
│   ├── salesperson.js           # /salesperson/*
│   ├── sysadmin.js              # /sysadmin/*
│   └── telecrm.js               # /api/telecrm/* (Android app API)
│
├── services/
│   └── ociService.js            # Oracle OCI file upload helper
│
├── utils/
│   ├── seedAdmin.js             # One-time admin user seed script
│   └── validators.js            # Input validation helpers
│
├── views/
│   ├── login.ejs
│   ├── partials/
│   │   ├── header.ejs           # HTML head, CSS, meta tags
│   │   ├── navbar.ejs           # Top navigation bar
│   │   ├── fab.ejs              # Floating Action Button (role-based menu)
│   │   └── footer.ejs           # JS imports, lucide init
│   ├── factoryIncharge/
│   │   ├── raw-material-stock.ejs   # Default home page for factory incharge
│   │   ├── finished-goods-stock.ejs
│   │   ├── stock-status.ejs         # Combined RM + FG view
│   │   ├── inward.ejs               # Inward history
│   │   ├── inward-new.ejs           # Record new inward (multi-item)
│   │   ├── production.ejs           # Production history
│   │   ├── production-new.ejs       # Record new production batch
│   │   ├── dispatch.ejs             # Dispatch history
│   │   └── dispatch-new.ejs         # Record new dispatch (multi-item)
│   ├── headoffice/
│   │   ├── dashboard.ejs            # Sales activity overview
│   │   ├── ims.ejs                  # Inventory Management System
│   │   ├── raw-material-stock.ejs   # Read-only RM stock view
│   │   ├── finished-goods-stock.ejs # Read-only FG stock view
│   │   ├── production-history.ejs   # Read-only production log
│   │   ├── telecrm.ejs              # Device & call log monitoring
│   │   └── campaigns.ejs            # Campaign management
│   ├── owner/
│   │   ├── dashboard.ejs
│   │   └── reports.ejs
│   ├── salesperson/
│   │   ├── dashboard.ejs
│   │   ├── create-order.ejs
│   │   ├── orders.ejs
│   │   └── reminders.ejs
│   └── sysadmin/
│       ├── dashboard.ejs
│       ├── users.ejs
│       └── products.ejs
│
├── .env                         # Environment variables (DO NOT commit)
├── .env.example                 # Template for .env
├── server.js                    # App entry point
└── package.json
```

---

## Routes Reference

### Auth — `/`
| Method | Path | Description |
|---|---|---|
| GET | `/login` | Login page |
| POST | `/login` | Authenticate & redirect by role |
| GET | `/logout` | Destroy session, redirect to login |

### Factory Incharge — `/factory-incharge`
> Accessible by: `factory_incharge`, `sysadmin`, `owner`

| Method | Path | Description |
|---|---|---|
| GET | `/stock/raw-materials` | Raw material stock (default home) |
| GET | `/stock/finished-goods` | Finished goods stock |
| GET | `/inward` | Inward history |
| GET | `/inward/new` | New inward form |
| POST | `/inward` | Submit inward (updates RM stock) |
| GET | `/production` | Production history |
| GET | `/production/new` | New production form |
| POST | `/production` | Submit production (deducts RM, adds FG stock) |
| GET | `/dispatch` | Dispatch history |
| GET | `/dispatch/new` | New dispatch form |
| POST | `/dispatch` | Submit dispatch (deducts FG stock) |

### Head Office — `/headoffice`
> Accessible by: `headoffice`, `sysadmin`, `owner`

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Sales activity dashboard |
| GET | `/stock/raw-materials` | Read-only RM stock view |
| GET | `/stock/finished-goods` | Read-only FG stock view |
| GET | `/production-history` | Read-only production log |
| GET | `/ims` | Inventory Management System |
| GET | `/download-report` | Download daily Excel report |
| GET | `/telecrm` | TeleCRM device monitoring |
| GET | `/telecrm/campaigns` | Campaign management page |
| POST | `/suppliers/create` | Add new supplier |
| POST | `/customers/create` | Add new customer |

### TeleCRM Android API — `/api/telecrm`
> Token-based auth via `deviceId` + `token`

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register a new Android device |
| POST | `/heartbeat` | Device keep-alive ping |
| POST | `/call-log` | Submit call log entry |
| POST | `/call-outcome` | Submit call outcome / order details |
| POST | `/upload-recording` | Upload call recording to OCI |
| GET | `/campaigns` | Get active campaigns for device |
| POST | `/campaigns/sync-stats` | Sync campaign call statistics |
| PATCH | `/device/:deviceId` | Update telecaller name |

### Shared API — `/api`
| Method | Path | Description |
|---|---|---|
| GET | `/customers/search` | Customer autocomplete |
| GET | `/products/search` | Product autocomplete |
| GET | `/suppliers/search` | Supplier autocomplete |
| GET | `/raw-materials/search` | Raw material autocomplete |
| GET | `/finished-goods/search` | Finished goods autocomplete |
| GET | `/owner/stats/*` | Owner analytics endpoints |

---

## Key Business Logic

### Production Flow
1. Factory incharge selects a **Finished Good** and enters quantity + batch number.
2. System checks the product's **Bill of Materials (BOM)** for required raw materials.
3. If sufficient RM stock exists → RM is **deducted**, FG stock is **incremented**, production record is saved.
4. If RM is insufficient → operation is blocked with a specific error message.

### Dispatch Flow
1. Factory incharge selects finished goods and quantities to dispatch.
2. FG stock is **deducted** for each item.
3. Dispatch record is saved with receiver, vehicle, and invoice details.
4. Optional invoice photo is uploaded to OCI Object Storage.

### Inward Flow
1. Factory incharge selects a supplier and adds raw material line items.
2. RM stock is **incremented** for each item.
3. Inward record is saved with invoice details and optional photo.

---

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Create .env from example
copy .env.example .env
# Fill in MONGODB_URI, SESSION_SECRET, OCI credentials, PORT

# 3. Seed default admin user (first time only)
npm run seed

# 4. Start the server
npm start
# → http://localhost:8080
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Secret key for express-session |
| `PORT` | Server port (default: 8080) |
| `NODE_ENV` | `development` or `production` |
| `OCI_USER_OCID` | Oracle Cloud user OCID |
| `OCI_TENANCY_OCID` | Oracle Cloud tenancy OCID |
| `OCI_FINGERPRINT` | API key fingerprint |
| `OCI_REGION` | OCI region (e.g. `ap-mumbai-1`) |
| `OCI_PRIVATE_KEY` | OCI private key (PEM, newlines as `\n`) |
| `OCI_NAMESPACE` | OCI object storage namespace |
| `OCI_BUCKET_NAME` | OCI bucket for recordings/invoices |

---

## Branch

Active development branch: **`feature/pwa-experiment`**
