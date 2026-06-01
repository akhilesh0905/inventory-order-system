from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app import models, schemas
from app.auth import get_password_hash
from fastapi import HTTPException, status

# ==========================================
# USER CRUD
# ==========================================
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ==========================================
# PRODUCT CRUD
# ==========================================
def get_product(db: Session, product_id: int, owner_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id, models.Product.owner_id == owner_id).first()

def get_product_by_sku(db: Session, sku: str, owner_id: int):
    return db.query(models.Product).filter(models.Product.sku == sku, models.Product.owner_id == owner_id).first()

def get_products(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Product).filter(models.Product.owner_id == owner_id).order_by(models.Product.id.desc()).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate, owner_id: int):
    db_product = get_product_by_sku(db, product.sku, owner_id)
    if db_product:
        raise ValueError(f"Product SKU code '{product.sku}' is already registered.")
    
    new_product = models.Product(
        owner_id=owner_id,
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity=product.quantity
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate, owner_id: int):
    db_product = get_product(db, product_id, owner_id)
    if not db_product:
        return None
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing = get_product_by_sku(db, update_data["sku"], owner_id)
        if existing:
            raise ValueError(f"Product SKU code '{update_data['sku']}' is already registered.")
            
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int, owner_id: int):
    db_product = get_product(db, product_id, owner_id)
    if not db_product:
        return None
    
    # Check if product is in any orders
    referenced = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if referenced:
        raise ValueError("Cannot delete product because it is referenced in one or more orders.")
        
    db.delete(db_product)
    db.commit()
    return db_product


# ==========================================
# CUSTOMER CRUD
# ==========================================
def get_customer(db: Session, customer_id: int, owner_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id, models.Customer.owner_id == owner_id).first()

def get_customer_by_email(db: Session, email: str, owner_id: int):
    return db.query(models.Customer).filter(models.Customer.email == email, models.Customer.owner_id == owner_id).first()

def get_customers(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).filter(models.Customer.owner_id == owner_id).order_by(models.Customer.id.desc()).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate, owner_id: int):
    db_customer = get_customer_by_email(db, customer.email, owner_id)
    if db_customer:
        raise ValueError(f"Customer email '{customer.email}' is already registered.")
        
    new_customer = models.Customer(
        owner_id=owner_id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

def delete_customer(db: Session, customer_id: int, owner_id: int):
    db_customer = get_customer(db, customer_id, owner_id)
    if not db_customer:
        return None
    
    # First, cancel/delete their orders to restore stock safely before cascading
    customer_orders = db.query(models.Order).filter(models.Order.customer_id == customer_id, models.Order.owner_id == owner_id).all()
    for order in customer_orders:
        delete_order(db, order.id, owner_id)
        
    db.delete(db_customer)
    db.commit()
    return db_customer


# ==========================================
# ORDER CRUD & STOCK CONTROL
# ==========================================
def get_order(db: Session, order_id: int, owner_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id, models.Order.owner_id == owner_id).first()

def get_orders(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Order).filter(models.Order.owner_id == owner_id).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_in: schemas.OrderCreate, owner_id: int):
    # Verify customer exists and belongs to owner
    customer = get_customer(db, order_in.customer_id, owner_id)
    if not customer:
        raise ValueError(f"Customer with ID {order_in.customer_id} does not exist.")

    total_amount = 0.0
    items_to_create = []

    # Process each order line item
    for item in order_in.items:
        product = get_product(db, item.product_id, owner_id)
        if not product:
            raise ValueError(f"Product with ID {item.product_id} does not exist.")
            
        # Inventory verification
        if product.quantity < item.quantity:
            raise ValueError(
                f"Insufficient stock for '{product.name}' (SKU: {product.sku}). "
                f"Requested: {item.quantity}, Available: {product.quantity}."
            )
            
        # Deduct stock
        product.quantity -= item.quantity
        
        # Calculate pricing snapshots
        unit_price = product.price
        total_amount += unit_price * item.quantity
        
        order_item = models.OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price
        )
        items_to_create.append(order_item)

    # Save order records
    db_order = models.Order(
        owner_id=owner_id,
        customer_id=order_in.customer_id,
        total_amount=round(total_amount, 2),
        items=items_to_create
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int, owner_id: int):
    db_order = get_order(db, order_id, owner_id)
    if not db_order:
        return None
        
    # Restore product inventory before removing the order
    for item in db_order.items:
        product = get_product(db, item.product_id, owner_id)
        if product:
            product.quantity += item.quantity
            
    db.delete(db_order)
    db.commit()
    return db_order


# ==========================================
# OPERATIONAL DASHBOARD METRICS
# ==========================================
def get_dashboard_stats(db: Session, owner_id: int):
    total_products = db.query(models.Product).filter(models.Product.owner_id == owner_id).count()
    total_customers = db.query(models.Customer).filter(models.Customer.owner_id == owner_id).count()
    total_orders = db.query(models.Order).filter(models.Order.owner_id == owner_id).count()
    
    # Low stock defined as < 10 units
    low_stock_query = db.query(models.Product).filter(models.Product.owner_id == owner_id, models.Product.quantity < 10)
    low_stock_count = low_stock_query.count()
    low_stock_products = low_stock_query.order_by(models.Product.quantity.asc()).limit(10).all()
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_count": low_stock_count,
        "low_stock_products": low_stock_products
    }
