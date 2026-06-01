# Apex Inventory Online Cloud Deployment Blueprint

This document details the step-by-step instructions to deploy the full-stack containerized **Apex Inventory & Order Management System** online using popular free cloud hosting platforms: **Render** (for Python FastAPI & PostgreSQL) and **Vercel** (for the React SPA).

---

## 1. Relational Database Deployment (Render)

First, deploy a managed PostgreSQL instance to persist live application data:

1.  Log in to [Render](https://render.com/).
2.  Click **New +** and select **PostgreSQL**.
3.  Configure database credentials:
    *   **Name**: `apex-inventory-db`
    *   **Region**: Select a region closest to your target audience.
    *   **Database Name**: `inventory_db` (or custom name)
    *   **Username**: `postgres` (or custom name)
4.  Select the **Free** tier.
5.  Click **Create Database**.
6.  Once active, copy the **Internal Database URL** (for other Render services) and the **External Database URL** (for remote administration or migration, if needed).

---

## 2. Python FastAPI Backend API Deployment (Render)

Render supports deploying backend systems directly from a custom `Dockerfile` located in your GitHub repository:

1.  Push this entire codebase to a private/public GitHub repository.
2.  In the Render Dashboard, click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the web service settings:
    *   **Name**: `apex-inventory-api`
    *   **Language**: Select **Docker** (Render will automatically detect our `backend/Dockerfile` if configured).
    *   **Docker Context Path**: `backend` (Points Render to the `backend/` subfolder)
    *   **Dockerfile Path**: `backend/Dockerfile`
5.  Scroll down to the **Environment Variables** section and click **Add Environment Variable**:
    *   `DATABASE_URL`: Paste the **Internal Database URL** copied from the PostgreSQL service step above (make sure it starts with `postgresql://`).
    *   `PORT`: `10000` (Render's default port, our backend Dockerfile dynamically binds to this via `${PORT}`).
6.  Select the **Free** tier and click **Create Web Service**.
7.  Wait for the build to complete and copy the live **API URL** (e.g. `https://apex-inventory-api.onrender.com`).

---

## 3. React Frontend SPA Deployment (Vercel)

Vercel is the premier platform for deploying React static assets with zero-configuration build optimizations:

1.  Log in to [Vercel](https://vercel.com/).
2.  Click **Add New...** and select **Project**.
3.  Import your GitHub repository.
4.  In the configuration page:
    *   **Framework Preset**: Select **Vite**.
    *   **Root Directory**: Click *Edit* and select the **`frontend`** folder.
5.  Configure **Build and Development Settings**:
    *   Ensure Build Command is set to `npm run build`.
    *   Output Directory should be `dist` (default for Vite).
6.  Expand the **Environment Variables** section and add:
    *   `VITE_API_URL`: Paste the live Render **API URL** (e.g. `https://apex-inventory-api.onrender.com`).
7.  Click **Deploy**.
8.  Vercel will build the React assets and generate a live, publicly accessible URL (e.g. `https://apex-inventory.vercel.app`).

---

## 4. Connection & CORS Verification

1.  Open your deployed frontend URL in a browser.
2.  The application will automatically perform a handshake with the deployed backend on Render and fetch the current statistics.
3.  Create a product, customer, and order to verify that all systems are synchronized and PostgreSQL persistence is functional!
