# Fatima Medical Store — Workspace

## Overview

Pharmacy e-commerce web app for Fatima Medical Store, Lucknow. pnpm monorepo with React/Vite frontend and Express/PostgreSQL backend.

## Store Details
- **Store Name**: Fatima Medical Store (فاطیما میڈیکل اسٹور)
- **Location**: Sector O, Mansarovar Yojna, Lucknow 226008
- **Phone**: +91 8081176774
- **UPI ID**: 8081176774@okbizaxis
- **Admin Login**: username `fatima04786`, password `imran@04786`

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 / **TypeScript**: 5.9
- **Frontend**: React + Vite (artifact: `medi-care`)
- **Backend**: Express 5 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod, api-zod (`lib/api-zod`)
- **Auth**: Token-based (Base64), stored in localStorage
- **Router**: Wouter (frontend)

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `medi-care` | `/` | Customer-facing React/Vite web app |
| `api-server` | (port 8080) | Express REST API |

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/medi-care run dev` — run frontend locally

## Features Implemented

### Customer Features
- Register / Login (phone + password)
- Browse store (search + category filter)
- Medicine info modal (dosage, how to take, side effects)
- Add to cart + checkout (UPI / COD)
- Order history with status tracking
- Referral rewards (₹50 per referral)
- Chat assistant (medicine guidance)

### Admin Features
- Separate admin login (Staff ID + password)
- Dashboard (orders, revenue, customers, low stock)
- Catalogue management (add/edit/delete products, AI photo scan simulation)
- Orders management (filter + status update)
- Customer list
- Change password via OTP

## Database Tables
- `customers` — id, name, phone, password, referralCode, referralCredits, referredBy, createdAt
- `products` — id, name, description, price, category, stock, dosage, howToTake, sideEffects, requiresPrescription, imageUrl, isActive
- `orders` — id, customerId, totalAmount, status, paymentMethod, paymentStatus, address, notes, createdAt
- `order_items` — id, orderId, productId, quantity, price, productName
- `admin` — id, username, password, phone

## API Routes (base: /api)

| Method | Path | Description |
|---|---|---|
| POST | /auth/admin/login | Admin login |
| POST | /auth/admin/request-otp | Request OTP for password change |
| POST | /auth/admin/change-password | Change admin password |
| POST | /auth/customer/login | Customer login |
| POST | /auth/customer/register | Customer register |
| GET | /products | List products (search, category filter) |
| GET | /products/categories | List categories |
| GET | /products/:id | Get product |
| POST | /products | Create product (admin) |
| PUT | /products/:id | Update product (admin) |
| DELETE | /products/:id | Delete product (admin) |
| GET | /orders | List orders (customerId, status filter) |
| POST | /orders | Create order |
| PUT | /orders/:id/status | Update order status (admin) |
| GET | /referrals/my | Get referral info |
| POST | /referrals/apply | Apply referral code |
| POST | /chat | Chat with medicine assistant |
| GET | /admin/dashboard | Admin dashboard stats |
| GET | /admin/customers | List all customers |
