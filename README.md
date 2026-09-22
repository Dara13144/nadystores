# 🚀 NadyStore Digital – Production Backend API

A high-performance, enterprise-grade backend for digital subscription marketplaces, instant digital voucher delivery, and automated payment processing.

---

## 🌟 Key Architecture & Features

### 💳 1. Payment Integrations & Auto-Fulfillment
- **CutLuy KHQR Auto-Checking**: Real-time polling and verification for Cambodia KHQR QR payments.
- **ABA PayWay**: Seamless checkout support for ABA mobile banking.
- **Bakong KHQR**: Native National Bank of Cambodia (NBC) KHQR support.
- **Internal Digital Wallet**: In-app wallet balance with top-up flows and instant single-click checkouts.
- **Sandbox/Simulated Provider**: Fast testing environment for development.

### 📦 2. Digital Product & Stock Management
- **Automatic Stock Fulfillment**: Immediate delivery of digital keys, account credentials, and redeemable vouchers upon successful payment.
- **Concurrency & Stock Reservation**: Prevents double-spending and overselling of limited digital inventory.
- **Categories & Coupons**: Discount system with usage limits, expiration rules, and minimum spend checks.

### 🛡️ 3. Enterprise Security & Anti-Abuse
- **Cloudflare Origin Shield**: Validates CF connecting IP and CF webhook secrets to reject direct origin bypass.
- **Multi-tier Rate Limiting**:
  - Global API limits
  - Strict auth rate limiting (anti-brute force)
  - Payment creation throttle
- **Scanner & Bot Defense**: Immediate 403 blocking of malicious User-Agents (e.g. `sqlmap`, `nikto`, `acunetix`) and directory traversal probes.
- **Strict Headers**: Configured with `helmet`, HPP (HTTP Parameter Pollution), and custom security headers.
- **Anti-Enumeration Auth**: Generic error responses prevent account/email harvesting.

### 🗄️ 4. Database & Persistence
- **Dual Support**: Fully compatible with PostgreSQL (via **Supabase**) and local JSON fallback store.
- **Ready Migrations**: Complete PostgreSQL database schema provided in `supabase/schema.sql`.

---

## 📂 Project Structure

```text
backend/
├── docs/
│   └── CLOUDFLARE_SECURITY_GUIDE.md  # Production WAF & Cloudflare setup
├── public/
│   └── uploads/                       # Product banners, assets & QR codes
├── src/
│   ├── config/                        # Database, env, and logger setup
│   ├── controllers/                   # Route controllers (Auth, Order, Wallet, Admin)
│   ├── data/                          # Seed data & store fallback
│   ├── middleware/                    # Security, auth, validation, rate limiting
│   ├── routes/                        # API route declarations
│   ├── services/                      # Business logic
│   │   ├── payments/                  # CutLuy, ABA, Bakong, Wallet providers
│   │   ├── orderService.js            # Order pipeline & fulfillment
│   │   ├── stockService.js            # Stock tracking & reservations
│   │   └── walletService.js           # Wallet balance transactions
│   ├── validators/                    # Zod input validation schemas
│   ├── app.js                         # Express application setup
│   └── server.js                      # HTTP server entry point
├── supabase/
│   └── schema.sql                     # Full PostgreSQL database schema
├── tests/
│   └── security.test.js               # Jest enterprise security test suite
├── .env.example                       # Environment variables template
└── package.json
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** v18 or higher
- **npm** or **yarn**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Dara13144/nadystores.git

# Navigate into the backend directory
cd nadystores

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the sample environment file and configure your keys:
```bash
cp .env.example .env
```

Key variables to configure in `.env`:
| Variable | Description |
|---|---|
| `PORT` | Server listening port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Secret key for signing access tokens |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role secret |
| `CUTLUY_API_KEY` | CutLuy merchant API key for KHQR verification |
| `FRONTEND_URL` | Allowed origin for CORS (e.g. `http://localhost:5173`) |

### 4. Running the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Running Security & Unit Tests
```bash
npm test
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new customer account | No |
| `POST` | `/api/auth/login` | Login and obtain JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Yes |
| `GET` | `/api/products` | List all digital products & stock | No |
| `GET` | `/api/products/:id` | Get product details | No |
| `POST` | `/api/orders` | Create order & initiate payment | Optional |
| `GET` | `/api/orders/:id` | Check order status & digital items | Optional |
| `POST` | `/api/payments/cutluy/check` | Poll CutLuy KHQR payment status | No |
| `GET` | `/api/wallet/balance` | Get current wallet balance | Yes |
| `POST` | `/api/wallet/topup` | Generate KHQR for wallet top-up | Yes |
| `GET` | `/api/admin/dashboard` | Admin analytics, sales & logs | Admin |

---

## 🔒 Security & Best Practices

For production deployments with **Cloudflare**, refer to the full checklist in [`docs/CLOUDFLARE_SECURITY_GUIDE.md`](docs/CLOUDFLARE_SECURITY_GUIDE.md).

---

## 📄 License
ISC License © NadyStore