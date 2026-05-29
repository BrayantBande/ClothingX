import json
import sqlite3

def seed_db():
    conn = sqlite3.connect("shirts.db")
    cursor = conn.cursor()
    
    print("Iniciando carga de datos de prueba en la base de datos local...")
    
    # 1. Limpiar tablas existentes para evitar duplicados
    cursor.execute("DELETE FROM categories")
    cursor.execute("DELETE FROM brands")
    cursor.execute("DELETE FROM shirts")
    cursor.execute("DELETE FROM banners")
    
    # 2. Insertar categorías
    categories = [("Camisetas",), ("Oversized",), ("Hoodies",), ("Polos",)]
    cursor.executemany("INSERT INTO categories (name) VALUES (?)", categories)
    print(f"Categorías insertadas: {len(categories)}")
    
    # 3. Insertar marcas
    brands = [("Supreme",), ("Off-White",), ("Nike",), ("Adidas",), ("SX Original",)]
    cursor.executemany("INSERT INTO brands (name) VALUES (?)", brands)
    print(f"Marcas insertadas: {len(brands)}")
    
    # 4. Insertar banners
    banners = [
        ("https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=2000&auto=format&fit=crop", "SHIRT X | Colección Urbana", 1),
        ("https://images.unsplash.com/photo-1578932750294-f5075e85f44a?q=80&w=2000&auto=format&fit=crop", "Nueva Colección Oversized", 1)
    ]
    cursor.executemany("INSERT INTO banners (image_url, title, is_active) VALUES (?, ?, ?)", banners)
    print(f"Banners insertados: {len(banners)}")
    
    # 5. Insertar camisas (productos)
    sizes_classic = json.dumps({"S": 10, "M": 15, "L": 12, "XL": 5})
    sizes_hoodie = json.dumps({"M": 8, "L": 10, "XL": 6, "XXL": 3})
    sizes_acid = json.dumps({"S": 5, "M": 8, "L": 7})
    
    shirts = [
        (
            "Camiseta Street Classic",
            "SX Original",
            "Camisetas",
            29.99,
            sizes_classic,
            "Negro,Blanco,Gris",
            "Camiseta clásica streetwear confeccionada en algodón de alta densidad. Cuenta con estampado tipográfico minimalista en el pecho y ajuste cómodo.",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
            ""
        ),
        (
            "Hoodie Retro Wave",
            "Off-White",
            "Hoodies",
            59.99,
            sizes_hoodie,
            "Negro,Rojo",
            "Suéter urbano con capucha ajustable y bolsillo canguro. Gráfico retro reflectante en la parte posterior y mangas acanaladas.",
            "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
            ""
        ),
        (
            "Camiseta Acid Wash Vintage",
            "Supreme",
            "Oversized",
            34.99,
            sizes_acid,
            "Gris Oscuro",
            "Camiseta con lavado ácido que proporciona un aspecto desgastado vintage único. Tela suave y transpirable ideal para climas cálidos.",
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
            ""
        ),
        (
            "Camiseta Polo Urban-Fit",
            "Nike",
            "Polos",
            39.99,
            sizes_classic,
            "Blanco,Azul Marino",
            "Polo clásico reinventado para la calle. Ajuste semi-holgado, cuello de punto plano y el emblemático logo bordado sutilmente.",
            "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=600&auto=format&fit=crop",
            ""
        )
    ]
    
    cursor.executemany(
        """
        INSERT INTO shirts (name, brand, category, price, sizes, colors, description, image_url, additional_images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, 
        shirts
    )
    print(f"Productos (camisas) insertados: {len(shirts)}")
    
    conn.commit()
    conn.close()
    print("¡Base de datos local inicializada exitosamente!")

if __name__ == "__main__":
    seed_db()
