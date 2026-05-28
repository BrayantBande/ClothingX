from pydantic import BaseModel, field_validator
from datetime import datetime

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class BrandBase(BaseModel):
    name: str

class BrandCreate(BrandBase):
    pass

class BrandResponse(BrandBase):
    id: int

    class Config:
        from_attributes = True

class ShirtBase(BaseModel):
    name: str
    brand: str
    category: str
    price: float
    sizes: str
    colors: str
    description: str
    image_url: str
    additional_images: str = ""

class ShirtCreate(ShirtBase):
    pass

class ShirtResponse(ShirtBase):
    id: int

    class Config:
        from_attributes = True

class BannerBase(BaseModel):
    image_url: str
    title: str = ""
    is_active: int = 1

class BannerCreate(BannerBase):
    pass

class BannerResponse(BannerBase):
    id: int

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    customer_name: str
    customer_phone: str
    items_json: str
    total_price: float

class OrderCreate(OrderBase):
    @field_validator('customer_name')
    @classmethod
    def validate_customer_name(cls, v):
        v = v.strip()
        name_part = v.split('(')[0].strip()
        if len(name_part) < 3:
            raise ValueError("El nombre del cliente debe tener al menos 3 caracteres")
        if len(name_part) > 45:
            raise ValueError("El nombre del cliente no debe superar los 45 caracteres")
        words = name_part.split()
        if len(words) > 4:
            raise ValueError("El nombre solo debe contener nombres y apellidos (máximo 4 palabras)")
        return v

    @field_validator('customer_phone')
    @classmethod
    def validate_customer_phone(cls, v):
        v = v.strip()
        digits = "".join(filter(str.isdigit, v))
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("El teléfono debe contener entre 10 y 15 dígitos")
        if len(set(digits)) == 1:
            raise ValueError("Por favor ingresa un número de teléfono válido")
        return v

class OrderResponse(OrderBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class StoreSettingsBase(BaseModel):
    whatsapp_number: str
    store_name: str
    store_slogan: str
    primary_color: str = "#ff3e6c"
    accent_color: str = "#0a0a0c"
    logo_url: str = ""

class StoreSettingsResponse(StoreSettingsBase):
    id: int
    class Config:
        from_attributes = True
