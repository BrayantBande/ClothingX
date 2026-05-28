from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime, timedelta

import models
import schemas
import auth
from database import get_db

router = APIRouter(prefix="/api", tags=["Orders"])

# --- ENDPOINT DE ESTADÍSTICAS ---

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    total_shirts = db.query(models.Shirt).count()
    categories = db.query(models.Category).all()
    brands = db.query(models.Brand).all()
    
    stats_per_category = []
    for cat in categories:
        count = db.query(models.Shirt).filter(models.Shirt.category.ilike(f"%{cat.name}%")).count()
        stats_per_category.append({"name": cat.name, "count": count})
        
    stats_per_brand = []
    for b in brands:
        count = db.query(models.Shirt).filter(models.Shirt.brand.ilike(f"%{b.name}%")).count()
        stats_per_brand.append({"name": b.name, "count": count})
        
    # --- MÉTRICAS DE VENTAS Y STOCK ADICIONALES ---
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    # Ventas y órdenes del mes actual
    monthly_orders_list = db.query(models.Order).filter(models.Order.created_at >= start_of_month).all()
    monthly_sales = sum(o.total_price for o in monthly_orders_list)
    monthly_orders_count = len(monthly_orders_list)
    
    # Historial de ventas de los últimos 30 días para la gráfica
    start_date = now - timedelta(days=29)
    start_date_clean = datetime(start_date.year, start_date.month, start_date.day)
    recent_orders = db.query(models.Order).filter(models.Order.created_at >= start_date_clean).all()
    
    daily_sales = {}
    for i in range(30):
        day = start_date_clean + timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        daily_sales[day_str] = {"total": 0.0, "count": 0}
        
    for order in recent_orders:
        order_day = order.created_at.strftime("%Y-%m-%d")
        if order_day in daily_sales:
            daily_sales[order_day]["total"] += order.total_price
            daily_sales[order_day]["count"] += 1
            
    sales_history = [{"date": k, "total": v["total"], "count": v["count"]} for k, v in sorted(daily_sales.items())]
    
    # Top 5 productos más vendidos (leyendo de items_json)
    all_orders = db.query(models.Order).all()
    product_totals = {}
    for order in all_orders:
        try:
            items = json.loads(order.items_json)
            for item in items:
                shirt_id = item.get("id")
                name = item.get("name")
                qty = item.get("quantity", 1)
                if shirt_id:
                    if shirt_id not in product_totals:
                        product_totals[shirt_id] = {"name": name, "quantity": 0}
                    product_totals[shirt_id]["quantity"] += qty
        except Exception:
            pass
            
    top_products = sorted(product_totals.values(), key=lambda x: x["quantity"], reverse=True)[:5]
    
    # Stock crítico: camisas con tallas que tengan stock <= 3
    all_shirts = db.query(models.Shirt).all()
    critical_stock = []
    for shirt in all_shirts:
        try:
            sizes_dict = json.loads(shirt.sizes) if shirt.sizes else {}
            low_sizes = []
            for size, qty in sizes_dict.items():
                if qty <= 3:
                    low_sizes.append({"size": size, "stock": qty})
            if low_sizes:
                critical_stock.append({
                    "id": shirt.id,
                    "name": shirt.name,
                    "brand": shirt.brand,
                    "image_url": shirt.image_url,
                    "low_sizes": low_sizes
                })
        except Exception:
            pass
            
    return {
        "total_shirts": total_shirts,
        "total_categories": len(categories),
        "total_brands": len(brands),
        "by_category": stats_per_category,
        "by_brand": stats_per_brand,
        "monthly_sales": monthly_sales,
        "monthly_orders_count": monthly_orders_count,
        "sales_history": sales_history,
        "top_products": top_products,
        "critical_stock": critical_stock
    }

# --- ENDPOINTS DE PEDIDOS ---

@router.post("/orders", response_model=schemas.OrderResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Validar Inventario Primero (Pre-check)
    try:
        items = json.loads(order.items_json)
        for item in items:
            shirt_id = item.get("id")
            size = item.get("size")
            qty = item.get("quantity", 1)
            
            shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
            if not shirt:
                raise HTTPException(status_code=400, detail=f"La camisa con ID {shirt_id} ya no existe.")
            
            if shirt.sizes:
                sizes_dict = json.loads(shirt.sizes)
                available = sizes_dict.get(size, 0)
                if available < qty:
                    raise HTTPException(status_code=400, detail=f"¡Ups! Alguien te ganó. Solo queda(n) {available} de '{shirt.name}' en talla {size}.")
            else:
                raise HTTPException(status_code=400, detail=f"La camisa '{shirt.name}' no tiene tallas configuradas.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error procesando los datos del carrito.")

    # 2. Si todo está bien, descontar el inventario y crear pedido
    for item in items:
        shirt_id = item.get("id")
        size = item.get("size")
        qty = item.get("quantity", 1)
        shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
        sizes_dict = json.loads(shirt.sizes)
        sizes_dict[size] -= qty
        shirt.sizes = json.dumps(sizes_dict)

    db_order = models.Order(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    # Devolver inventario si se cancela el pedido
    try:
        items = json.loads(order.items_json)
        for item in items:
            shirt_id = item.get("id")
            size = item.get("size")
            qty = item.get("quantity", 1)
            
            shirt = db.query(models.Shirt).filter(models.Shirt.id == shirt_id).first()
            if shirt and shirt.sizes:
                try:
                    sizes_dict = json.loads(shirt.sizes)
                    if size in sizes_dict:
                        sizes_dict[size] = sizes_dict[size] + qty
                        shirt.sizes = json.dumps(sizes_dict)
                except Exception:
                    pass
    except Exception:
        pass
        
    db.delete(order)
    db.commit()
    return {"message": "Pedido eliminado e inventario restaurado"}

@router.get("/admin/orders", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

@router.put("/orders/{order_id}/status")
def update_order_status(order_id: int, status_data: dict, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    order.status = status_data.get("status", "Pendiente")
    db.commit()
    return {"message": "Estado actualizado", "status": order.status}
