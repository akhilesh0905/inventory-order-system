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

# Fixture to generate an active JWT token and inject standard auth headers
@pytest.fixture
def auth_headers():
    # 1. Register test user
    client.post(
        "/auth/register",
        json={"username": "testuser", "email": "test@example.com", "password": "securepassword"}
    )
    # 2. Login test user to retrieve token
    login_resp = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "securepassword"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ==========================================
# AUTHENTICATION UNIT TESTS
# ==========================================
def test_protected_endpoints_deny_anonymous():
    # Verify that request without headers is blocked with 401 Unauthorized
    response = client.get("/products")
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_user_registration_and_login_validation():
    # 1. Register new user
    reg_resp = client.post(
        "/auth/register",
        json={"username": "newuser", "email": "new@example.com", "password": "password123"}
    )
    assert reg_resp.status_code == 201
    assert reg_resp.json()["username"] == "newuser"
    assert "password_hash" not in reg_resp.json() # Verify password hashing safety (omitted)

    # 2. Attempt duplicate username registration
    reg_dup_name = client.post(
        "/auth/register",
        json={"username": "newuser", "email": "other@example.com", "password": "password123"}
    )
    assert reg_dup_name.status_code == 400
    assert "already taken" in reg_dup_name.json()["detail"]

    # 3. Attempt duplicate email registration
    reg_dup_email = client.post(
        "/auth/register",
        json={"username": "otheruser", "email": "new@example.com", "password": "password123"}
    )
    assert reg_dup_email.status_code == 400
    assert "already registered" in reg_dup_email.json()["detail"]

    # 4. Login with email instead of username (flexible login check)
    login_resp = client.post(
        "/auth/login",
        json={"username": "new@example.com", "password": "password123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
    token = login_resp.json()["access_token"]

    # 5. Fetch profile using generated JWT
    profile_resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_resp.status_code == 200
    assert profile_resp.json()["username"] == "newuser"


# ==========================================
# CRUD SERVICE TESTS (WITH AUTHENTICATION)
# ==========================================
def test_create_and_read_product(auth_headers):
    # 1. Create a product
    response = client.post(
        "/products",
        json={"name": "Acoustic Guitar", "sku": "GIT-AC-001", "price": 299.99, "quantity": 15},
        headers=auth_headers
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
        json={"name": "Electric Guitar", "sku": "GIT-AC-001", "price": 499.99, "quantity": 5},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

    # 3. Read back product
    response = client.get(f"/products/{product_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Acoustic Guitar"

def test_create_customer(auth_headers):
    # 1. Create customer
    response = client.post(
        "/customers",
        json={"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890"},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["email"] == "john@example.com"
    
    # 2. Duplicate email check
    response = client.post(
        "/customers",
        json={"name": "Jane Doe", "email": "john@example.com", "phone": "987-654-3210"},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_order_creation_stock_deduction_and_restoration(auth_headers):
    # 1. Setup - Create product & customer
    prod_resp = client.post(
        "/products",
        json={"name": "Wireless Mouse", "sku": "MOU-WL-100", "price": 25.00, "quantity": 10},
        headers=auth_headers
    )
    prod_id = prod_resp.json()["id"]

    cust_resp = client.post(
        "/customers",
        json={"name": "Alice Smith", "email": "alice@example.com", "phone": "555-0199"},
        headers=auth_headers
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
        },
        headers=auth_headers
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["total_amount"] == 100.00 # 25.00 * 4
    order_id = order_data["id"]

    # Verify inventory was reduced
    prod_check = client.get(f"/products/{prod_id}", headers=auth_headers)
    assert prod_check.json()["quantity"] == 6 # 10 - 4

    # 3. Insufficient stock failure check
    insufficient_order_resp = client.post(
        "/orders",
        json={
            "customer_id": cust_id,
            "items": [
                {"product_id": prod_id, "quantity": 7} # only 6 left
            ]
        },
        headers=auth_headers
    )
    assert insufficient_order_resp.status_code == 400
    assert "Insufficient stock" in insufficient_order_resp.json()["detail"]

    # 4. Cancel/Delete order and verify inventory is restored
    delete_resp = client.delete(f"/orders/{order_id}", headers=auth_headers)
    assert delete_resp.status_code == 200
    
    prod_restored = client.get(f"/products/{prod_id}", headers=auth_headers)
    assert prod_restored.json()["quantity"] == 10 # restored back to original!

