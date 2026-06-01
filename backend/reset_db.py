from app.database import engine, Base
from app import models

print("Dropping all existing tables...")
Base.metadata.drop_all(bind=engine)

print("Recreating all tables with new schema...")
Base.metadata.create_all(bind=engine)

print("Database reset completed successfully!")
