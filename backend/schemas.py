from pydantic import BaseModel
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
    pass

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
