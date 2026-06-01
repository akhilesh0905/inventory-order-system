import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Append parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import app

# Setup testing in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables in test database
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Override FastAPI dependency injection
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_database():
    # Drop and recreate tables to ensure clean state for each test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_create_and_read_product():
    # 1. Create a product
    response = client.post(
        "/products",
        json={"name": "Acoustic Guitar", "sku": "GIT-AC-001", "price": 299.99, "quantity": 15}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Acoustic Guitar"
    assert data["sku"] == "GIT-AC-001"
    assert data["quantity"] == 15
    product_id = data["id"]

    # 2. Duplicate SKU check
    response = client.post(
        "/products",
        json={"name": "Electric Guitar", "sku": "GIT-AC-001", "price": 499.99, "quantity": 5}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

    # 3. Read back product
    response = client.get(f"/products/{product_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Acoustic Guitar"

def test_create_customer():
    # 1. Create customer
    response = client.post(
        "/customers",
        json={"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "john@example.com"
    
    # 2. Duplicate email check
    response = client.post(
        "/customers",
        json={"name": "Jane Doe", "email": "john@example.com", "phone": "987-654-3210"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_order_creation_stock_deduction_and_restoration():
    # 1. Setup - Create product & customer
    prod_resp = client.post(
        "/products",
        json={"name": "Wireless Mouse", "sku": "MOU-WL-100", "price": 25.00, "quantity": 10}
    )
    prod_id = prod_resp.json()["id"]

    cust_resp = client.post(
        "/customers",
        json={"name": "Alice Smith", "email": "alice@example.com", "phone": "555-0199"}
    )
    cust_id = cust_resp.json()["id"]

    # 2. Create order with quantity 4
    order_resp = client.post(
        "/orders",
        json={
            "customer_id": cust_id,
            "items": [
                {"product_id": prod_id, "quantity": 4}
            ]
        }
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["total_amount"] == 100.00 # 25.00 * 4
    order_id = order_data["id"]

    # Verify inventory was reduced
    prod_check = client.get(f"/products/{prod_id}")
    assert prod_check.json()["quantity"] == 6 # 10 - 4

    # 3. Insufficient stock failure check
    insufficient_order_resp = client.post(
        "/orders",
        json={
            "customer_id": cust_id,
            "items": [
                {"product_id": prod_id, "quantity": 7} # only 6 left
            ]
        }
    )
    assert insufficient_order_resp.status_code == 400
    assert "Insufficient stock" in insufficient_order_resp.json()["detail"]

    # 4. Cancel/Delete order and verify inventory is restored
    delete_resp = client.delete(f"/orders/{order_id}")
    assert delete_resp.status_code == 200
    
    prod_restored = client.get(f"/products/{prod_id}")
    assert prod_restored.json()["quantity"] == 10 # restored back to original!
