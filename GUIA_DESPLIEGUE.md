# 🚀 Guía de Despliegue Rápido: SHIRT X

Esta guía detalla el proceso paso a paso para duplicar (clonar) este proyecto y desplegarlo en producción para un nuevo cliente utilizando las plataformas gratuitas de **Supabase**, **Render** y **Vercel**.

---

## 📂 Paso 1: Configurar la Base de Datos en Supabase
Supabase provee la base de datos relacional (PostgreSQL) y el almacenamiento para las imágenes.

1. Regístrate en [Supabase](https://supabase.com) y crea un nuevo proyecto.
2. Ve a la sección **SQL Editor** del menú lateral izquierdo.
3. Haz clic en **New query** (Nueva consulta), pega el siguiente script SQL y presiona **Run** (Ejecutar):

```sql
-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 2. Crear tabla de marcas
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 3. Crear tabla de camisas (inventario)
CREATE TABLE IF NOT EXISTS shirts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    price FLOAT NOT NULL,
    sizes VARCHAR(255), -- Almacena JSON string de tallas y cantidad (ej: {"S":10, "M":15})
    colors VARCHAR(255) DEFAULT '', -- Colores separados por comas (ej: Blanco, Negro)
    description TEXT,
    image_url VARCHAR(255),
    additional_images TEXT
);

-- 4. Crear tabla de banners
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    image_url VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    is_active INTEGER DEFAULT 1
);

-- 5. Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(255) NOT NULL,
    items_json TEXT NOT NULL,
    total_price FLOAT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crear tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL
);

-- 7. Crear tabla de ajustes de la tienda
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    whatsapp_number VARCHAR(50) DEFAULT '584242370620',
    store_name VARCHAR(255) DEFAULT 'SHIRT X',
    store_slogan VARCHAR(255) DEFAULT 'Streetwear & Urban Culture',
    primary_color VARCHAR(50) DEFAULT '#0066ff',
    accent_color VARCHAR(50) DEFAULT '#0a0a0c',
    logo_url VARCHAR(255) DEFAULT ''
);

-- ==========================================
-- REGISTROS INICIALES OBLIGATORIOS
-- ==========================================

-- A. Insertar ajustes por defecto
INSERT INTO store_settings (whatsapp_number, store_name, store_slogan, primary_color) 
VALUES ('584242370620', 'SHIRT X', 'Streetwear & Urban Culture', '#0066ff')
ON CONFLICT DO NOTHING;

-- B. Crear usuario administrador inicial
-- Usuario: admin
-- Contraseña temporal: admin123 (Se encripta con bcrypt usando el hash de abajo)
INSERT INTO admin_users (username, hashed_password)
VALUES ('admin', '$2b$12$R.S/O0s9p4Xp2.q.wN3jfeG3M5XnI/94u3gH3sX8Z369iEa1l/5yG')
ON CONFLICT DO NOTHING;
```

4. Ve a **Project Settings** ➔ **API** y copia:
   - `Project URL`
   - `API Key (service_role)` (la llave secreta para subir imágenes).
5. Ve a **Storage** en el menú izquierdo, crea un nuevo Bucket público llamado exactamente `shirts` para almacenar las imágenes de los productos.

---

## 🚀 Paso 2: Desplegar el Backend en Render
Render hospedará tu backend programado en Python (FastAPI).

1. Regístrate en [Render](https://render.com) e inicia sesión.
2. Crea un nuevo servicio: **New +** ➔ **Web Service**.
3. Conéctalo con tu repositorio de GitHub.
4. Completa la configuración del servicio:
   - **Name**: `api-shirt-x-cliente`
   - **Language**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. En la pestaña **Environment** del servicio en Render, añade las siguientes variables de entorno:
   - `DATABASE_URL`: Copia la cadena de conexión URI de Supabase (la encuentras en Supabase ➔ Settings ➔ Database ➔ Connection String ➔ URI). *Recuerda cambiar la contraseña temporal de la base de datos en la cadena de conexión*.
   - `SUPABASE_URL`: La URL del proyecto de Supabase.
   - `SUPABASE_KEY`: La clave secreta de API (`service_role`).
   - `SUPABASE_BUCKET`: `shirts`
6. Presiona **Deploy Web Service**. Una vez completado, copia la URL pública que Render te asigne (ej: `https://api-shirt-x-cliente.onrender.com`).

---

## 💻 Paso 3: Desplegar el Frontend en Vercel
Vercel publicará la página web del catálogo de forma gratuita y ultra rápida.

1. Ve al código del frontend y asegúrate de actualizar la variable `API_URL` en config.js con la URL que te dio Render en el Paso 2 (debe terminar en `/api`).
2. Haz commit y push de tus cambios a GitHub.
3. Regístrate en [Vercel](https://vercel.com) e importa tu repositorio.
4. En la configuración del proyecto:
   - **Root Directory**: Escribe `frontend` (así Vercel despliega solo la carpeta del diseño público e ignora la carpeta del backend).
5. Haz clic en **Deploy**. 
6. ¡Listo! Vercel te dará el enlace público final de la tienda (ej: `https://shirt-x-cliente.vercel.app`).

---

## 🔑 Paso 4: Ajustes del Administrador y Primera Sesión

1. Entra a la página del panel: `https://shirt-x-cliente.vercel.app/admin-login.html`.
2. Inicia sesión con las credenciales creadas por defecto:
   - **Usuario**: `admin`
   - **Contraseña**: `admin123`
3. Ve a la pestaña **Ajustes** dentro del panel de administración:
   - Configura el nombre oficial de la tienda.
   - Configura su **número de WhatsApp** con el código de país (sin el signo "+"). Ej: `584121234567`.
   - Modifica el eslogan y sube el logo oficial de la marca.
4. **IMPORTANTE**: Ve a la pestaña **Cambiar Contraseña** en la barra lateral del Administrador y actualiza la clave temporal `admin123` por una nueva contraseña segura para el cliente.
