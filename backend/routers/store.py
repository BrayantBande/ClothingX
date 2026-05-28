from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List
from io import BytesIO
from PIL import Image
import base64
import os
import requests
import uuid

import time
import models
import schemas
import auth
from database import get_db

router = APIRouter(prefix="/api", tags=["Store"])

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

settings_cache = TTLCache(ttl_seconds=120)
banners_cache = TTLCache(ttl_seconds=120)

def invalidate_store_cache():
    settings_cache.invalidate()
    banners_cache.invalidate()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "shirts")

def upload_to_supabase(file_content: bytes, filename: str, content_type: str) -> str:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        file_extension = filename.split(".")[-1].lower() if "." in filename else "bin"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        base_url = SUPABASE_URL.rstrip("/")
        upload_url = f"{base_url}/storage/v1/object/{SUPABASE_BUCKET}/{unique_filename}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "ApiKey": SUPABASE_KEY,
            "Content-Type": content_type
        }
        
        response = requests.post(upload_url, data=file_content, headers=headers)
        if response.status_code in [200, 201]:
            return f"{base_url}/storage/v1/object/public/{SUPABASE_BUCKET}/{unique_filename}"
        else:
            print(f"Supabase upload API error (Status {response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"Excepción subiendo a Supabase Storage: {e}")
        return None

def compress_and_base64(file_content: bytes, filename: str, content_type: str) -> str:
    try:
        img = Image.open(BytesIO(file_content))
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        img.thumbnail((600, 600), Image.Resampling.LANCZOS)
        
        output = BytesIO()
        img.save(output, format="WEBP", quality=70)
        compressed_bytes = output.getvalue()
        
        encoded = base64.b64encode(compressed_bytes).decode("utf-8")
        return f"data:image/webp;base64,{encoded}"
    except Exception as e:
        print(f"Error comprimiendo imagen, usando codificación directa: {e}")
        encoded = base64.b64encode(file_content).decode("utf-8")
        return f"data:{content_type};base64,{encoded}"

# --- ENDPOINT DE CARGA DE IMÁGENES ---

@router.post("/upload")
async def upload_images(request: Request, files: List[UploadFile] = File(...), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    print(f"DEBUG: Recibiendo {len(files)} archivos para subir")
    urls = []
    try:
        for file in files:
            file_extension = file.filename.split(".")[-1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Extensión no permitida: {file_extension}. Use JPG, PNG o WEBP.")
            
            file.file.seek(0, 2)
            file_size = file.file.tell()
            file.file.seek(0)
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"El archivo {file.filename} es demasiado grande. Máximo 5MB.")
                
            file_content = await file.read()
            
            # Intentar primero subir a Supabase
            public_url = upload_to_supabase(file_content, file.filename, file.content_type)
            if public_url:
                urls.append(public_url)
                print(f"DEBUG: Archivo {file.filename} subido exitosamente a Supabase Storage: {public_url}")
            else:
                # Fallback a base64
                base64_url = compress_and_base64(file_content, file.filename, file.content_type)
                urls.append(base64_url)
                print(f"DEBUG: Fallback a Base64 para archivo {file.filename}")
                
        return {"urls": urls}
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS DE CONFIGURACIÓN ---

@router.get("/settings", response_model=schemas.StoreSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    cached_settings = settings_cache.get()
    if cached_settings is None:
        settings = db.query(models.StoreSettings).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Configuración no encontrada")
        cached_settings = schemas.StoreSettingsResponse.model_validate(settings).model_dump()
        settings_cache.set(cached_settings)
    return cached_settings

@router.put("/settings", response_model=schemas.StoreSettingsResponse)
def update_settings(settings_data: schemas.StoreSettingsBase, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    settings = db.query(models.StoreSettings).first()
    if not settings:
        settings = models.StoreSettings(**settings_data.model_dump())
        db.add(settings)
    else:
        for key, value in settings_data.model_dump().items():
            setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    invalidate_store_cache()
    return settings

# --- ENDPOINTS DE BANNERS ---

@router.get("/banners", response_model=List[schemas.BannerResponse])
def get_banners(db: Session = Depends(get_db)):
    cached_banners = banners_cache.get()
    if cached_banners is None:
        banners = db.query(models.Banner).filter(models.Banner.is_active == 1).all()
        cached_banners = [schemas.BannerResponse.model_validate(b).model_dump() for b in banners]
        banners_cache.set(cached_banners)
    return cached_banners

@router.get("/admin/banners", response_model=List[schemas.BannerResponse])
def get_all_banners(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    return db.query(models.Banner).all()

@router.post("/banners", response_model=schemas.BannerResponse)
def create_banner(banner: schemas.BannerCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_banner = models.Banner(**banner.model_dump())
    db.add(db_banner)
    db.commit()
    db.refresh(db_banner)
    invalidate_store_cache()
    return db_banner

@router.delete("/banners/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(db_banner)
    db.commit()
    invalidate_store_cache()
    return {"message": "Banner eliminado"}
