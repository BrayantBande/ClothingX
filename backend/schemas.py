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
        
        import re
        if not re.match(r"^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$", name_part):
            raise ValueError("El nombre solo debe contener letras y espacios")
            
        if len(name_part) < 3:
            raise ValueError("El nombre del cliente debe tener al menos 3 caracteres")
        if len(name_part) > 45:
            raise ValueError("El nombre del cliente no debe superar los 45 caracteres")
            
        if re.search(r"(.)\1{3,}", name_part):
            raise ValueError("El nombre contiene caracteres repetitivos no válidos")
            
        words = name_part.split()
        if len(words) < 2 or len(words) > 4:
            raise ValueError("Por favor ingresa tu nombre y apellido (entre 2 y 4 palabras)")
            
        if any(len(w) > 18 for w in words):
            raise ValueError("Cada palabra del nombre debe tener una longitud razonable (máx. 18 letras)")
            
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
            
        is_valid_vzla = False
        valid_prefix_4 = {'0412', '0414', '0424', '0416', '0426', '0212'}
        valid_prefix_3 = {'412', '414', '424', '416', '426', '212'}
        
        if digits.startswith('58'):
            after_58 = digits[2:]
            if after_58.startswith('0'):
                if after_58[:4] in valid_prefix_4 and len(after_58) == 11:
                    is_valid_vzla = True
            else:
                if after_58[:3] in valid_prefix_3 and len(after_58) == 10:
                    is_valid_vzla = True
        elif digits.startswith('0'):
            if digits[:4] in valid_prefix_4 and len(digits) == 11:
                is_valid_vzla = True
        else:
            if digits[:3] in valid_prefix_3 and len(digits) == 10:
                is_valid_vzla = True
                
        if not is_valid_vzla:
            raise ValueError("Número de teléfono de Venezuela no válido. Debe comenzar por 0412, 0414, 0424, 0416, 0426 o 0212")
            
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
