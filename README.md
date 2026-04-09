# 🏗️ Bytoons Flow - IT Asset Management

Welcome to the **Bytoons Flow** suite! This is a professional IT Asset Management application built with a focus on local-first performance and data integrity.

---

## ⚡ Quick Start

### 1. Start the Backend
From the main project directory, run:
```bash
node server.js
```
*Alternatively, you can use `npm start`.*

### 2. Access the Dashboard
Once the server is running (`--- SYSTEM STATUS: OPERATIONAL ---`), open your browser to:
👉 **[http://localhost:5000](http://localhost:5000)** (Login Gateway)

---

## 🔐 Credentials
For local development, the default admin account is bootstrapped from `server/.env`:
- **Email**: `ADMIN_EMAIL`
- **Password**: `ADMIN_PASSWORD`

For production, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, and `CORS_ORIGINS` as environment variables and keep them out of source control.

---

## 📁 Project Structure
- **/server**: Node.js/Express backend (SQLite Registry).
- **/public/index.html**: Login Gateway (Entry Point).
- **/public/home.html**: Main Infrastructure Pulse (Dashboard).
- **/public/employees.html**: Enterprise Personnel Directory.
- **/public/assets.html**: Hardware & Inventory Management.
- **/public/mapping.html**: Relational Asset Topology.
- **/public/reports.html**: Granular Audit Logs & Exports.

---

## 🛠️ Technical Stack
- **Backend**: Node.js & Express
- **Registry**: SQLite (via Persistent `db.sqlite`)
- **Frontend**: Tailwind CSS & Vanilla JavaScript
- **Security**: JWT-based Authentication & Bcrypt Hashing

---

## ⚠️ Important Notes
- **Direct File Access**: If you open `.html` files directly (e.g., `file://...`), the app will intelligently fallback to `localhost:5000` to maintain synchronization, but running via the web server is recommended for the best experience.
- **Data Persistence**: All changes are automatically saved to the local SQLite database in the `/server` folder.
- **Production**: Disable open registration with `ALLOW_REGISTRATION=false` and restrict API access with `CORS_ORIGINS`.
