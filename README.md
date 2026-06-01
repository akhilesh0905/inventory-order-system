# Apex Inventory: Containerized Inventory & Order Management System

Apex Inventory is a highly robust, full-stack, production-ready operational management system. It enables businesses to catalog products, maintain a directory of customers, place complex multi-item orders, validate stock levels with database transaction protection, and review business health statistics from a modern dashboard interface.

---

## 🚀 Orchestrated Local Quickstart

Get the entire full-stack system running locally in seconds using **Docker Compose**.

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   Port `3000` (frontend), `8000` (backend), and `5432` (database) must be free.

### Step 1: Clone and Configure
Ensure you are in the project root directory:
```bash
# Verify the presence of docker-compose.yml and .env
```

### Step 2: Spin Up Containers
Launch all services simultaneously in detached background mode:
```bash
docker-compose up --build -d
```
*Docker Compose will automatically set up the persistent volume, wait for the PostgreSQL container to pass health checks, compile/cache the backend packages, build the Vite static assets, and serve them via Nginx.*

### Step 3: Access Deployed Environs
*   **Sleek Frontend UI**: [http://localhost:3000](http://localhost:3000)
*   **FastAPI RESTful API**: [http://localhost:8000](http://localhost:8000)
*   **Auto-generated Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 4: Tear Down
To stop and remove all orchestrations safely:
```bash
docker-compose down -v
```

---

## 🧪 Running Automated Unit Tests

Verify core backend validation rules, unique constraints, and inventory auto-deduction/auto-restoration logic.

### Option A: Within the Docker Container (Recommended)
With the compose stack active, execute the tests in the backend context:
```bash
docker-compose exec backend pytest
```

### Option B: Local Virtual Environment
If developing locally without Docker active:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

---

## 🛠️ Relational Database Schema & System Flow

```
   ┌──────────────┐             ┌──────────────┐
   │  customers   │             │   products   │
   ├──────────────┤             ├──────────────┤
   │ id (PK)      │             │ id (PK)      │
   │ name         │             │ name         │
   │ email (UQ)   │             │ sku (UQ, IDX)│
   │ phone        │             │ price        │
   └──────┬───────┘             │ quantity     │
          │ 1                   └──────┬───────┘
          │                            │ 1
          │ 0..*                       │
   ┌──────▼───────┐             ┌──────▼───────┐
   │    orders    │             │ order_items  │
   ├──────────────┤             ├──────────────┤
   │ id (PK)      │             │ id (PK)      │
   │ customer_id  ├────────────►│ order_id (FK)│
   │ total_amount │ 1      0..* │ product_id(FK)
   │ created_at   │             │ quantity     │
   └──────────────┘             │ unit_price   │
                                └──────────────┘
```

### Business Logic Highlights:
1.  **Inventory Integrity Constraint**: Database tables enforce a strict `quantity >= 0` check constraint, preventing negative stock.
2.  **Atomicity**: Placing an order runs inside a database transaction; if any product lacks sufficient stock, the entire transaction is aborted.
3.  **Auto-Restoration**: Deleting an order (`DELETE /orders/{id}`) automatically loops through the order line items and restores the inventory levels.
