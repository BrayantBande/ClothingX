from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from database import Base
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Brand(Base):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Shirt(Base):
    __tablename__ = "shirts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, index=True)
    category = Column(String, index=True)
    price = Column(Float)
    sizes = Column(String)  # "S,M,L,XL"
    colors = Column(String) # "Blanco,Negro,Rojo"
    description = Column(Text)
    image_url = Column(String)
    additional_images = Column(Text) # "url1,url2,url3"

class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String)
    title = Column(String, nullable=True)
    is_active = Column(Integer, default=1)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, index=True)
    customer_phone = Column(String)
    items_json = Column(String) # JSON string: [{id, name, brand, price, qty, size, color}]
    total_price = Column(Float)
    status = Column(String, default="Pendiente")
    created_at = Column(DateTime, default=datetime.now)

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class StoreSettings(Base):
    __tablename__ = "store_settings"
    id = Column(Integer, primary_key=True, index=True)
    whatsapp_number = Column(String, default="584242370620")
    store_name = Column(String, default="SHIRT X")
    store_slogan = Column(String, default="Streetwear & Urban Culture")
    primary_color = Column(String, default="#ff3e6c") # Neon Pink/Red as default
    accent_color = Column(String, default="#0a0a0c")  # Matte dark default
    logo_url = Column(String, default="")
