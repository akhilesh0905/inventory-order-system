from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from app import models, schemas, crud, auth
from app.database import engine, get_db

# Initialize database schemas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Multi-tenant production-ready system for handling products, customers, and inventory-deducting orders.",
    version="2.0.0"
)

# Enable CORS for frontend and deployment networks
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://inventory-order-system-alpha.vercel.app",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handler to map business rule failures (ValueError) to HTTP Bad Request
@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(exc)
    )

# ==========================================
# AUTHENTICATION ROUTERS
# ==========================================
@app.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ==========================================
# PRODUCT ROUTERS
# ==========================================
@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        return crud.create_product(db=db, product=product, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/products", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_products(db, owner_id=current_user.id, skip=skip, limit=limit)

@app.get("/products/{product_id}", response_model=schemas.ProductResponse)
def read_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_product = crud.get_product(db, product_id=product_id, owner_id=current_user.id)
    if db_product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return db_product

@app.put("/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        db_product = crud.update_product(db, product_id=product_id, product_update=product_update, owner_id=current_user.id)
        if db_product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return db_product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/products/{product_id}", response_model=schemas.ProductResponse)
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        db_product = crud.delete_product(db, product_id=product_id, owner_id=current_user.id)
        if db_product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return db_product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# CUSTOMER ROUTERS
# ==========================================
@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        return crud.create_customer(db=db, customer=customer, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_customers(db, owner_id=current_user.id, skip=skip, limit=limit)

@app.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_customer = crud.get_customer(db, customer_id=customer_id, owner_id=current_user.id)
    if db_customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return db_customer

@app.delete("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_customer = crud.delete_customer(db, customer_id=customer_id, owner_id=current_user.id)
    if db_customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return db_customer


# ==========================================
# ORDER ROUTERS & TRANSACTION MANAGEMENT
# ==========================================
@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        return crud.create_order(db=db, order_in=order, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/orders", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_orders(db, owner_id=current_user.id, skip=skip, limit=limit)

@app.get("/orders/{order_id}", response_model=schemas.OrderResponse)
def read_order(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_order = crud.get_order(db, order_id=order_id, owner_id=current_user.id)
    if db_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return db_order

@app.delete("/orders/{order_id}", response_model=schemas.OrderResponse)
def delete_order(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_order = crud.delete_order(db, order_id=order_id, owner_id=current_user.id)
    if db_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return db_order


# ==========================================
# OPERATIONAL DASHBOARD METRICS
# ==========================================
@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_dashboard_stats(db, owner_id=current_user.id)

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
