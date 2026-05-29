import os
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

import models
import auth
from database import engine, get_db
from routers import auth as auth_router
from routers import catalog
from routers import orders
from routers import store

# Crear las tablas automáticamente
models.Base.metadata.create_all(bind=engine)

# Crear usuario admin por defecto si no existe
def create_default_admin():
    db = next(get_db())
    try:
        admin = db.query(models.AdminUser).filter(models.AdminUser.username == "admin").first()
        if not admin:
            hashed_password = auth.get_password_hash("admin123")
            new_admin = models.AdminUser(username="admin", hashed_password=hashed_password)
            db.add(new_admin)
            db.commit()

        settings = db.query(models.StoreSettings).first()
        if not settings:
            default_settings = models.StoreSettings()
            db.add(default_settings)
            db.commit()
    finally:
        db.close()

try:
    create_default_admin()
except Exception as e:
    print(f"Advertencia al inicializar admin por defecto: {e}")

# Configuración del logging estándar de Python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("api")

# Instancia principal de FastAPI
app = FastAPI(
    title="Shirt Store API", 
    description="API robusta y modularizada para el catálogo de camisas (Streetwear)", 
    version="1.0.0"
)

# Middleware global para capturar excepciones no controladas
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Error crítico no controlado en la ruta {request.url.path}: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Error interno del servidor. Por favor, reporta este problema si persiste."}
        )

# Carpeta de subidas local (como fallback)
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configurar CORS para comunicación con el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint raíz
@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"message": "API de Tienda de Camisas funcionando y modularizada. Visita /docs para probar los endpoints."}

# Incluir los Routers Modularizados
app.include_router(auth_router.router)
app.include_router(catalog.router)
app.include_router(orders.router)
app.include_router(store.router)
