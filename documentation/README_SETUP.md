# Fleetease Final (Local Setup)

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (running locally)

## 1) Database
1. Create DB `fleetease` (via pgAdmin or psql):
   - CREATE DATABASE fleetease;
2. Ensure user `postgres` has access and note its password.

## 2) Backend
Path: fleetease-backend

1. Copy .env.example to .env and update values:
```
PORT=5000
DB_USER=postgres
DB_PASS=YOUR_POSTGRES_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fleetease
JWT_SECRET=change_this_secret
CORS_ORIGIN=http://localhost:3000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GOOGLE_MAPS_API_KEY=
```
2. Install deps and seed tables:
```
npm install
npm run setup-db
```
3. Start server:
```
npm run dev
```
- API: http://localhost:5000/api
- Health: /api/health

## 3) Frontend
Path: fleetease-web

1. Create .env (or copy .env.example):
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=
```
2. Install and start:
```
npm install
npm start
```
- App: http://localhost:3000

## 4) Demo Flow
1. Open frontend → Search → select route → seats → checkout.
2. Payment uses demo flow; order is created (mock if no keys) and instantly verified.
3. View booking details → download invoice PDF.
4. Admin: Login with admin (admin@fleetease.com / admin123) → /admin for charts.

## 5) GPS Simulator
- Start backend.
- From project root:
```
node demo_tools/gps_demo_run.js
```
- Config: demo_tools/gps_demo_config.json
- Frontend admin/fleet and detail pages can reflect live data.

## Notes
- Adjust ports if occupied.
- For Razorpay test, add keys to backend .env and frontend REACT_APP_RAZORPAY_KEY_ID.
