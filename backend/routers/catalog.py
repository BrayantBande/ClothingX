import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
import auth
from database import get_db
from routers.store import delete_from_supabase

router = APIRouter(prefix="/api", tags=["Catalog"])

# --- SISTEMA DE CACHÉ EN MEMORIA (TTL) ---

class TTLCache:
    def __init__(self, ttl_seconds=120):
        self.ttl = ttl_seconds
        self.data = None
        self.last_updated = 0

    def get(self):
        if self.data is not None and (time.time() - self.last_updated) < self.ttl:
            return self.data
        return None

    def set(self, data):
        self.data = data
        self.last_updated = time.time()

    def invalidate(self):
        self.data = None
        self.last_updated = 0

shirts_cache = TTLCache(ttl_seconds=120)
categories_cache = TTLCache(ttl_seconds=120)
brands_cache = TTLCache(ttl_seconds=120)

def invalidate_catalog_cache():
    shirts_cache.invalidate()
    categories_cache.invalidate()
    brands_cache.invalidate()

# --- ENDPOINTS DE CAMISAS ---

@router.get("/shirts", response_model=List[schemas.ShirtResponse])
def get_shirts(brand: str = None, category: str = None, db: Session = Depends(get_db)):
    cached_shirts = shirts_cache.get()
    if cached_shirts is None:
        query = db.query(models.Shirt)
        db_shirts = query.all()
        # Serializar usando pydantic para evitar DetachedInstanceError en multi-hilo
        cached_shirts = [schemas.ShirtResponse.model_validate(s).model_dump() for s in db_shirts]
        shirts_cache.set(cached_shirts)
    
    # Filtrar en memoria si es necesario
    result = cached_shirts
    if brand:
        brand_lower = brand.lower()
        result = [s for s in result if s.get("brand") and brand_lower in s["brand"].lower()]
    if category:
        category_lower = category.lower()
        result = [s for s in result if s.get("category") and category_lower in s["category"].lower()]
    return result

@router.get("/shirts/{shirt_id}", response_model=schemas.ShirtResponse)
def get_shirt(shirt_id: int, db: Session = Depends(get_db)):
    cached_shirts = shirts_cache.get()
    if cached_shirts is not None:
        shirt = next((s for s in cached_shirts if s["id"] == shirt_id), None)
        if shirt:
            return shirt
            
    shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
    if shirt is None:
        raise HTTPException(status_code=404, detail="Camisa no encontrada")
    return shirt

@router.post("/shirts", response_model=schemas.ShirtResponse, status_code=201)
def create_shirt(shirt: schemas.ShirtCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_shirt = models.Shirt(**shirt.model_dump())
    db.add(db_shirt)
    db.commit()
    db.refresh(db_shirt)
    invalidate_catalog_cache()
    return db_shirt

@router.put("/shirts/{shirt_id}", response_model=schemas.ShirtResponse)
def update_shirt(shirt_id: int, shirt_update: schemas.ShirtCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
    if db_shirt is None:
        raise HTTPException(status_code=404, detail="Camisa no encontrada")
    
    # Guardar imágenes viejas para comparar
    old_main_image = db_shirt.image_url
    old_additional_images = db_shirt.additional_images or ""
    
    for key, value in shirt_update.model_dump().items():
        setattr(db_shirt, key, value)
        
    db.commit()
    db.refresh(db_shirt)
    
    # Identificar y eliminar imágenes antiguas obsoletas de Supabase
    new_main_image = db_shirt.image_url
    new_additional_images = db_shirt.additional_images or ""
    
    old_urls = set()
    if old_main_image:
        old_urls.add(old_main_image.strip())
    if old_additional_images:
        for url in old_additional_images.split(","):
            url_stripped = url.strip()
            if url_stripped:
                old_urls.add(url_stripped)
                
    new_urls = set()
    if new_main_image:
        new_urls.add(new_main_image.strip())
    if new_additional_images:
        for url in new_additional_images.split(","):
            url_stripped = url.strip()
            if url_stripped:
                new_urls.add(url_stripped)
                
    obsolete_urls = old_urls - new_urls
    for url in obsolete_urls:
        delete_from_supabase(url)
        
    invalidate_catalog_cache()
    return db_shirt

@router.delete("/shirts/{shirt_id}")
def delete_shirt(shirt_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
    if db_shirt is None:
        raise HTTPException(status_code=404, detail="Camisa no encontrada")
    
    # Eliminar imagen principal de Supabase
    if db_shirt.image_url:
        delete_from_supabase(db_shirt.image_url)
        
    # Eliminar imágenes adicionales de Supabase
    if db_shirt.additional_images:
        for img_url in db_shirt.additional_images.split(","):
            img_url_stripped = img_url.strip()
            if img_url_stripped:
                delete_from_supabase(img_url_stripped)
                
    db.delete(db_shirt)
    db.commit()
    invalidate_catalog_cache()
    return {"message": "Camisa eliminada correctamente"}

# --- ENDPOINTS DE CATEGORÍAS ---

@router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    cached_cats = categories_cache.get()
    if cached_cats is None:
        db_cats = db.query(models.Category).all()
        cached_cats = [schemas.CategoryResponse.model_validate(c).model_dump() for c in db_cats]
        categories_cache.set(cached_cats)
    return cached_cats

@router.post("/categories", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    try:
        db.commit()
        db.refresh(db_category)
        invalidate_catalog_cache()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    return db_category

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="No encontrada")
    db.delete(db_cat)
    db.commit()
    invalidate_catalog_cache()
    return {"message": "Categoría eliminada"}

# --- ENDPOINTS DE MARCAS ---

@router.get("/brands", response_model=List[schemas.BrandResponse])
def get_brands(db: Session = Depends(get_db)):
    cached_brands = brands_cache.get()
    if cached_brands is None:
        db_brands = db.query(models.Brand).all()
        cached_brands = [schemas.BrandResponse.model_validate(b).model_dump() for b in db_brands]
        brands_cache.set(cached_brands)
    return cached_brands

@router.post("/brands", response_model=schemas.BrandResponse)
def create_brand(brand: schemas.BrandCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_brand = models.Brand(**brand.model_dump())
    db.add(db_brand)
    try:
        db.commit()
        db.refresh(db_brand)
        invalidate_catalog_cache()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="La marca ya existe")
    return db_brand

@router.delete("/brands/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not db_brand:
        raise HTTPException(status_code=404, detail="No encontrada")
    db.delete(db_brand)
    db.commit()
    invalidate_catalog_cache()
    return {"message": "Marca eliminada"}
