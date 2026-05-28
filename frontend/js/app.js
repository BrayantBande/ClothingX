// Configuración de la API - cargada desde /js/config.js

const state = {
    shirts: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    activeCategory: 'all',
    activeBrand: 'all',
    searchQuery: '',
    currentPage: 1,
    pageSize: window.innerWidth < 768 ? 8 : 12,
    storeConfig: {
        whatsapp_number: "584242370620",
        store_name: "SHIRT X",
        store_slogan: "Streetwear & Urban Culture"
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Shirt X App Inicializada");
    
    // Ocultar Preloader
    const preloader = document.getElementById('preloader');
    if(preloader) {
        setTimeout(() => { preloader.classList.add('hidden'); }, 800);
    }
    
    // Inyectar Modal de Carrito y Footer
    setupCartUI();
    updateCartCount();
    setupScrollReveal();
    
    // Cargar config de la tienda
    loadStoreConfig().then(() => {
        // Rutador básico según la página actual
        if (document.getElementById('product-detail-container')) {
            loadSingleShirt();
        } else {
            loadBanners();
            loadShirts();
        }
    });
    
    setupMobileMenu();
});

async function loadStoreConfig() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        if (res.ok) {
            const config = await res.json();
            state.storeConfig = config;
            
            // Actualizar nombres en la UI
            document.title = document.title.replace("SHIRT X", config.store_name).replace("Shirt X", config.store_name);
            
            document.querySelectorAll('.logo a').forEach(el => {
                const textHtml = `<span class="store-name-text">${config.store_name}</span>`;
                if(config.logo_url) {
                    el.innerHTML = `<img src="${config.logo_url}" alt="${config.store_name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; vertical-align: middle;">${textHtml}`;
                } else {
                    el.innerHTML = textHtml;
                }
            });
            
            const footerName = document.querySelector('.footer-store-name');
            if (footerName) footerName.innerText = config.store_name;

            // Actualizar portada (Hero Placeholder) si existe en la UI actual
            const heroTitle = document.querySelector('#hero-banner-container h1');
            if (heroTitle) heroTitle.innerText = config.store_name;
            const heroSlogan = document.querySelector('#hero-banner-container p');
            if (heroSlogan) heroSlogan.innerText = config.store_slogan;

            // Optimización de SEO: Metadatos dinámicos
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', `Catálogo oficial de ${config.store_name}. ${config.store_slogan}. Realiza tus pedidos de forma directa y segura.`);
            }

            // Inyectar Botón Flotante de WhatsApp sincronizado e inmediato
            if (!document.querySelector('.wa-floating-btn') && !window.location.pathname.includes('admin')) {
                const waFloat = document.createElement('a');
                waFloat.className = 'wa-floating-btn';
                waFloat.target = '_blank';
                waFloat.href = `https://wa.me/${config.whatsapp_number}?text=Hola,%20tengo%20una%20duda%20sobre%20la%20tienda`;
                waFloat.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.665.592 1.221.774 1.393.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-5.824 4.74-10.563 10.567-10.564 5.823 0 10.564 4.745 10.564 10.568s-4.74 10.564-10.564 10.564z"/>
                    </svg>`;
                document.body.appendChild(waFloat);
            }
        }
    } catch(e) {
        console.error("Error cargando configuración", e);
    }
}

// Configurar Menú Hamburguesa Móvil
function setupMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    if (!hamburger) return;

    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar-filters');
    
    if (sidebar && !document.querySelector('.close-menu-btn')) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.className = 'close-menu-btn';
        closeBtn.onclick = closeMenu;
        sidebar.prepend(closeBtn);
    }

    function openMenu() {
        overlay.classList.add('active');
        if (sidebar) {
            sidebar.classList.add('open');
        } else {
            let basicMenu = document.getElementById('basic-mobile-menu');
            if(!basicMenu) {
                basicMenu = document.createElement('div');
                basicMenu.id = 'basic-mobile-menu';
                basicMenu.className = 'sidebar-filters open';
                basicMenu.innerHTML = `
                    <button class="close-menu-btn" onclick="document.querySelector('.mobile-overlay').click()">✕</button>
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">Menú</h3>
                    
                    <div class="search-box" style="margin-bottom: 2rem;">
                        <input type="text" id="mobile-global-search" class="search-input" placeholder="Buscar camisa..." onkeypress="if(event.key==='Enter') { window.location.href = 'catalogo.html?search=' + encodeURIComponent(this.value); }">
                    </div>

                    <div class="filter-group">
                        <a href="index.html" class="sidebar-btn" style="display:block; text-align:center; margin-bottom: 1rem;">Ir al Inicio</a>
                        <a href="catalogo.html" class="sidebar-btn active" style="display:block; text-align:center;">Ver Catálogo Completo</a>
                    </div>
                `;
                document.body.appendChild(basicMenu);
            } else {
                basicMenu.classList.add('open');
            }
        }
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        overlay.classList.remove('active');
        if (sidebar) sidebar.classList.remove('open');
        const basicMenu = document.getElementById('basic-mobile-menu');
        if(basicMenu) basicMenu.classList.remove('open');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
}

// Animación simple del header al hacer scroll
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (!header) return;
    if (window.scrollY > 50) {
        header.style.background = 'rgba(10, 10, 12, 0.95)';
        header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
    } else {
        header.style.background = 'rgba(10, 10, 12, 0.8)';
        header.style.boxShadow = 'none';
    }
});

// --- SISTEMA DE TOASTS ---
window.showToast = function(message, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<svg width="20" height="20" fill="none" stroke="#4cd964" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
    else if (type === 'error') icon = '<svg width="20" height="20" fill="none" stroke="#0066ff" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3300);
};

// --- SKELETON LOADERS ---
function renderSkeletons(container, count = 4) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line price"></div>
                    <div style="margin-top:auto; display:flex; gap:10px;">
                        <div class="skeleton-line" style="width: 50%; height: 35px;"></div>
                        <div class="skeleton-line" style="width: 50%; height: 35px;"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

// --- LÓGICA DE API Y CATÁLOGO ---
async function loadBanners() {
    const bannerContainer = document.getElementById('hero-banner-container');
    if (!bannerContainer) return;

    try {
        const response = await fetch(`${API_URL}/banners`);
        if (!response.ok) return;
        const banners = await response.json();
        
        if (banners && banners.length > 0) {
            let html = '<div class="banner-track" id="banner-track">';
            banners.forEach((banner, index) => {
                html += `
                    <div class="banner-slide" style="background-image: url('${banner.image_url}');">
                        <div class="banner-overlay"></div>
                        <div class="banner-content-center">
                            <h1>${banner.title || state.storeConfig.store_name}</h1>
                            <p>${state.storeConfig.store_slogan}</p>
                            <a href="catalogo.html" class="btn-primary">EXPLORAR</a>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            bannerContainer.innerHTML = html;
            
            if (banners.length > 1) {
                let currentIdx = 0;
                setInterval(() => {
                    currentIdx = (currentIdx + 1) % banners.length;
                    const track = document.getElementById('banner-track');
                    if(track) track.style.transform = `translateX(-${currentIdx * 100}%)`;
                }, 4000);
            }
        }
    } catch (e) {
        console.error("Error cargando banners", e);
    }
}

async function loadShirts() {
    const latestContainer = document.getElementById('latest-shoes-container'); // Reusando el ID del grid principal
    const catalogContainer = document.getElementById('catalog-page-container');
    
    if (latestContainer) renderSkeletons(latestContainer, 4);
    if (catalogContainer) renderSkeletons(catalogContainer, 8);

    try {
        const response = await fetch(`${API_URL}/shirts`);
        if (!response.ok) throw new Error('Error en el servidor');
        
        const data = await response.json();
        state.shirts = data;
        
        if (latestContainer) {
            const latestShirts = [...state.shirts].reverse().slice(0, 4);
            renderShirts(latestShirts, latestContainer);
        }
        
        if (catalogContainer) {
            const urlParams = new URLSearchParams(window.location.search);
            const searchParam = urlParams.get('search');
            if (searchParam) {
                state.searchQuery = searchParam.toLowerCase();
                const catInput = document.getElementById('search-input');
                if (catInput) catInput.value = searchParam;
                const globalInput = document.getElementById('global-search-input');
                if (globalInput) globalInput.value = searchParam;
            }
            applyCombinedFilters(catalogContainer);
            setupFilters(catalogContainer);
            setupSearch(catalogContainer);
        }

    } catch (error) {
        console.error("Error cargando camisas:", error);
        const errorMsg = '<p style="color: red; text-align: center; grid-column: 1/-1; padding: 2rem; border: 1px solid red; border-radius: 8px;">Error conectando al servidor. Asegúrate de que el backend de Python esté corriendo.</p>';
        if(latestContainer) latestContainer.innerHTML = errorMsg;
        if(catalogContainer) catalogContainer.innerHTML = errorMsg;
    }
}

function renderShirts(shirtsToRender, container) {
    container.innerHTML = ''; 
    
    if(shirtsToRender.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">No se encontraron camisas para esta búsqueda.</p>';
        return;
    }

    shirtsToRender.forEach(shirt => {
        let sizesObj = {};
        try {
            sizesObj = JSON.parse(shirt.sizes);
        } catch(e) {
            if(shirt.sizes) shirt.sizes.split(',').forEach(s => sizesObj[s.trim()] = 1);
        }
        
        const availableSizes = Object.entries(sizesObj).filter(([s, q]) => q > 0);

        const card = document.createElement('a');
        card.href = `producto.html?id=${shirt.id}`;
        card.className = 'shoe-card reveal'; // Reusando estilo shoe-card
        card.style.textDecoration = 'none';
        card.style.color = 'inherit';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.position = 'relative';

        const outOfStockLabel = availableSizes.length === 0 
            ? `<div style="position: absolute; top: 10px; right: 10px; background: #0066ff; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; z-index: 10;">AGOTADO</div>` 
            : '';

        card.innerHTML = `
            ${outOfStockLabel}
            <div class="shoe-img-container">
                <img src="${shirt.image_url}" alt="${shirt.name}" onerror="this.src='https://via.placeholder.com/300?text=Sin+Imagen'">
            </div>
            <div class="shoe-details">
                <span class="shoe-brand">${shirt.brand}</span>
                <h3 class="shoe-name">${shirt.name}</h3>
                <div class="shoe-price">$${shirt.price.toFixed(2)}</div>
            </div>
        `;
        container.appendChild(card);
        if(window.scrollObserver) window.scrollObserver.observe(card);
    });
}

async function loadSingleShirt() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const shirtId = urlParams.get('id');
    
    if (!shirtId) {
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); margin-top: 100px; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 1.5rem;">No se especificó una camisa válida.</p>
                    <a href="catalogo.html" class="btn-primary" style="display: inline-block; text-decoration: none;">Ver Catálogo</a>
                </div>
            `;
        }
        return;
    }

    if (container) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); margin-top: 150px;">Cargando información de la camisa...</p>`;
    }

    try {
        const shirtRes = await fetch(`${API_URL}/shirts/${shirtId}`);
        if (!shirtRes.ok) {
            throw new Error(shirtRes.status === 404 ? 'Camisa no encontrada' : 'Error en el servidor');
        }
        const shirt = await shirtRes.json();
        
        renderSingleShirt(shirt);

        // Cargar productos relacionados
        try {
            const shirtsRes = await fetch(`${API_URL}/shirts`);
            if (shirtsRes.ok) {
                state.shirts = await shirtsRes.json();
                renderRelatedShirts(shirt);
            } else {
                state.shirts = [shirt];
                renderRelatedShirts(shirt);
            }
        } catch (relatedErr) {
            console.error("Error cargando productos relacionados:", relatedErr);
            state.shirts = [shirt];
            const relatedSection = document.querySelector('.related-products-section');
            if (relatedSection) relatedSection.style.display = 'none';
        }

    } catch (error) {
        console.error("Error cargando camisa:", error);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); margin-top: 100px; padding: 2rem; border: 1px solid rgba(255,62,108,0.2); border-radius: var(--border-radius); background: rgba(255,62,108,0.02);">
                    <p style="font-size: 1.2rem; color: var(--accent-color); margin-bottom: 1rem;">No pudimos cargar la información del producto.</p>
                    <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">${error.message === 'Camisa no encontrada' ? 'El modelo no existe o fue eliminado.' : 'Problema de conexión con el servidor.'}</p>
                    <div style="display: flex; justify-content: center; gap: 15px;">
                        <button onclick="window.loadSingleShirt()" class="btn-primary">Reintentar</button>
                        <a href="catalogo.html" class="btn-primary" style="background: transparent; border: 1px solid var(--accent-color); display: inline-block; text-decoration: none;">Ir al Catálogo</a>
                    </div>
                </div>
            `;
        }
    }
}

window.loadSingleShirt = loadSingleShirt;

function renderSingleShirt(shirt) {
    let sizesObj = {};
    try {
        sizesObj = JSON.parse(shirt.sizes);
    } catch(e) {
        if(shirt.sizes) shirt.sizes.split(',').forEach(s => sizesObj[s.trim()] = 1);
    }
    
    const availableSizes = Object.entries(sizesObj).filter(([s, q]) => q > 0);
    const sizeOptions = availableSizes.map(([size, qty]) => `<option value="${size}" data-qty="${qty}">${size}</option>`).join('');
    
    // Configurar colores
    const colorsList = shirt.colors ? shirt.colors.split(',') : [];
    const colorOptions = colorsList.map(c => `<option value="${c.trim()}">${c.trim()}</option>`).join('');
    
    const stockMsg = availableSizes.length > 0 ? "Selecciona talla y color para ver disponibilidad" : "Agotado";
    const disableBtn = availableSizes.length === 0 ? "disabled" : "";
    
    const descHTML = shirt.description ? shirt.description : 'Camisa streetwear de alta calidad, costuras reforzadas y corte premium.';

    const allImages = [shirt.image_url];
    if (shirt.additional_images) {
        shirt.additional_images.split(',').forEach(url => {
            if (url.trim()) allImages.push(url.trim());
        });
    }

    const galleryHTML = allImages.length > 1 ? `
        <div class="product-thumbnails">
            ${allImages.map((url, idx) => `
                <img src="${url}" class="thumb ${idx === 0 ? 'active' : ''}" 
                     onclick="changeProductImg(this, '${url}')"
                     onerror="this.style.display='none'">
            `).join('')}
        </div>
    ` : '';

    const html = `
        <div class="product-layout">
            <div class="product-gallery">
                <div class="main-img-container">
                    <img id="main-product-img" src="${shirt.image_url}" alt="${shirt.name}" onerror="this.src='https://via.placeholder.com/600?text=Sin+Imagen'">
                </div>
                ${galleryHTML}
            </div>
            <div class="product-info">
                <div class="product-brand">${shirt.brand}</div>
                <h1 class="product-title">${shirt.name}</h1>
                <div class="product-price">$${shirt.price.toFixed(2)}</div>
                
                <p class="product-meta"><strong>Categoría:</strong> <span style="text-transform: capitalize;">${shirt.category}</span></p>
                
                <div class="product-actions">
                    <p id="stock-indicator-${shirt.id}" style="color: var(--accent-color); font-weight: bold; margin-bottom: 10px; font-size: 0.9rem;">${stockMsg}</p>
                    <div class="product-selection-grid">
                        <div class="selectors-row">
                            <select class="size-selector-large" id="size-${shirt.id}" onchange="updateStockIndicator(${shirt.id}, this)">
                                <option value="" disabled selected>Talla</option>
                                ${sizeOptions}
                            </select>
                            <select class="size-selector-large" id="color-${shirt.id}">
                                <option value="" disabled selected>Color</option>
                                ${colorOptions}
                            </select>
                        </div>
                        <div class="cart-row">
                            <input type="number" id="qty-${shirt.id}" class="qty-selector" value="1" min="1" title="Cantidad" ${disableBtn}>
                            <button class="btn-primary btn-add-to-cart" onclick="addToCart(${shirt.id}, this)" ${disableBtn}>
                                ${availableSizes.length > 0 ? 'AÑADIR AL CARRITO' : 'AGOTADO'}
                            </button>
                        </div>
                    </div>
                    <!-- METODOS DE PAGO -->
                    <div style="margin-top: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">🔒 Métodos de Pago Disponibles</p>
                        <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                            <span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #fff;">Zelle</span>
                            <span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #f3ba2f;">Binance</span>
                            <span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: var(--accent-color);">Pago Móvil</span>
                            <span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #00d2ff;">Transferencia</span>
                            <span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #4cd964;">Efectivo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="product-description-container" style="margin-top: 2rem; background: var(--surface-color); padding: 2.5rem; border-radius: var(--border-radius); border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="margin-bottom: 1.5rem; font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.8rem;">Detalles y Composición</h2>
            <p class="product-description" style="margin-bottom: 0; white-space: pre-wrap;">${descHTML}</p>
        </div>
    `;
    const container = document.getElementById('product-detail-container');
    if (container) container.innerHTML = html;
}

function renderRelatedShirts(currentShirt) {
    const container = document.getElementById('related-shoes-container'); // Reusando el contenedor anterior
    if (!container) return;
    
    let related = state.shirts.filter(s => 
        s.id !== currentShirt.id && 
        ((s.category && s.category.toLowerCase().trim() === currentShirt.category?.toLowerCase().trim()) || 
         (s.brand && s.brand.toLowerCase().trim() === currentShirt.brand?.toLowerCase().trim()))
    );
    
    if (related.length < 4) {
        const fillCandidates = state.shirts.filter(s => 
            s.id !== currentShirt.id && 
            !related.find(r => r.id === s.id)
        );
        related = related.concat(fillCandidates);
    }
    
    const finalRelated = related.slice(0, 4);
    
    if (finalRelated.length === 0) {
        const sec = document.querySelector('.related-products-section');
        if (sec) sec.style.display = 'none';
        return;
    }
    
    renderShirts(finalRelated, container);
}

window.updateStockIndicator = function(shirtId, selectElement) {
    const qtyInput = document.getElementById(`qty-${shirtId}`);
    const indicator = document.getElementById(`stock-indicator-${shirtId}`);
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.qty) {
        const maxQty = parseInt(selectedOption.dataset.qty);
        indicator.innerText = `Disponibles: ${maxQty} unidades`;
        qtyInput.max = maxQty;
        if (parseInt(qtyInput.value) > maxQty) {
            qtyInput.value = maxQty;
        }
    }
};

window.changeProductImg = function(thumb, url) {
    document.getElementById('main-product-img').src = url;
    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function setupFilters(container) {
    const filterContainer = document.getElementById('dynamic-filters-container');
    if (!filterContainer) return;

    const categories = {};
    const brands = {};
    
    state.shirts.forEach(s => {
        const cat = s.category ? s.category.toLowerCase().trim() : 'otros';
        const brand = s.brand ? s.brand.toLowerCase().trim() : 'otras';
        
        categories[cat] = (categories[cat] || 0) + 1;
        brands[brand] = (brands[brand] || 0) + 1;
    });

    let html = `
        <h4>Por Categoría</h4>
        <button class="filter-btn sidebar-btn active" data-type="category" data-filter="all">Todas (${state.shirts.length})</button>
    `;
    
    for (const [cat, count] of Object.entries(categories)) {
        html += `<button class="filter-btn sidebar-btn" data-type="category" data-filter="${cat}" style="text-transform: capitalize;">${cat} (${count})</button>`;
    }

    html += `
        <h4 style="margin-top: 1.5rem;">Por Marca</h4>
        <button class="filter-btn sidebar-btn active" data-type="brand" data-filter="all">Todas</button>
    `;

    for (const [brand, count] of Object.entries(brands)) {
        html += `<button class="filter-btn sidebar-btn" data-type="brand" data-filter="${brand}" style="text-transform: capitalize;">${brand} (${count})</button>`;
    }

    filterContainer.innerHTML = html;

    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            
            buttons.forEach(b => {
                if(b.getAttribute('data-type') === type) {
                    b.classList.remove('active');
                }
            });
            e.target.classList.add('active');
            
            if (type === 'category') state.activeCategory = e.target.getAttribute('data-filter');
            if (type === 'brand') state.activeBrand = e.target.getAttribute('data-filter');
            
            state.currentPage = 1;
            applyCombinedFilters(container);
        });
    });
}

function setupSearch(container) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            state.currentPage = 1;
            applyCombinedFilters(container);
        });
    }
}

function applyCombinedFilters(container) {
    if (!container) return;
    let filtered = state.shirts;
    
    if (state.activeCategory && state.activeCategory !== 'all') {
        filtered = filtered.filter(s => s.category && s.category.toLowerCase().trim() === state.activeCategory);
    }
    
    if (state.activeBrand && state.activeBrand !== 'all') {
        filtered = filtered.filter(s => s.brand && s.brand.toLowerCase().trim() === state.activeBrand);
    }
    
    if (state.searchQuery && state.searchQuery !== '') {
        filtered = filtered.filter(s => 
            (s.name && s.name.toLowerCase().includes(state.searchQuery)) || 
            (s.brand && s.brand.toLowerCase().includes(state.searchQuery))
        );
    }
    
    const totalItems = filtered.length;
    const paginated = filtered.slice(0, state.currentPage * state.pageSize);
    
    renderShirts(paginated, container);
    
    if (paginated.length < totalItems) {
        const btnContainer = document.createElement('div');
        btnContainer.style = "grid-column: 1/-1; text-align: center; margin-top: 2rem;";
        btnContainer.innerHTML = `<button class="btn-primary" onclick="loadMoreShirts()">Cargar Más (${totalItems - paginated.length} restantes)</button>`;
        container.appendChild(btnContainer);
    }
}

window.loadMoreShirts = function() {
    state.currentPage++;
    applyCombinedFilters(document.getElementById('catalog-page-container'));
};

window.executeGlobalSearch = function() {
    const input = document.getElementById('global-search-input');
    if (!input) return;
    const query = input.value.trim();
    if (window.location.pathname.includes('catalogo.html')) {
        const catInput = document.getElementById('search-input');
        if(catInput) catInput.value = query;
        state.searchQuery = query.toLowerCase();
        state.currentPage = 1;
        applyCombinedFilters(document.getElementById('catalog-page-container'));
    } else {
        window.location.href = `catalogo.html?search=${encodeURIComponent(query)}`;
    }
};

// --- CARRITO ---
function setupCartUI() {
    const cartHTML = `
        <div id="cart-overlay" class="cart-overlay"></div>
        <div id="cart-drawer" class="cart-drawer">
            <div class="cart-header">
                <h2>Tu Carrito</h2>
                <button id="close-cart-btn" class="close-cart-btn">✕</button>
            </div>
            <div id="cart-items-container" class="cart-items-list"></div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cart-total-amount">$0.00</span>
                </div>
                
                <div id="checkout-form" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
                    <h3 style="font-size: 0.9rem; margin-bottom: 10px; color: var(--text-secondary);">Datos de Envío</h3>
                    <input type="text" id="checkout-name" placeholder="Tu Nombre Completo" required maxlength="45" style="width:100%; margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:4px; font-family: var(--font-family);">
                    <input type="tel" id="checkout-phone" placeholder="Tu Teléfono (ej. +58...)" required maxlength="20" style="width:100%; margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:4px; font-family: var(--font-family);">
                    <select id="checkout-payment-method" required style="width:100%; margin-bottom:15px; padding:10px; background:rgba(15,15,20,0.95); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:4px; font-family: var(--font-family); font-size:0.9rem; outline:none; height:42px;">
                        <option value="" disabled selected>Selecciona tu Método de Pago...</option>
                        <option value="Pago Móvil">Pago Móvil</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Binance Pay">Binance Pay</option>
                        <option value="Transferencia">Transferencia Bancaria</option>
                        <option value="Acordar por WhatsApp">Efectivo / Acordar por WhatsApp</option>
                    </select>
                    <button class="btn-primary" id="btn-confirm-order" style="width:100%;" onclick="submitOrder()">Confirmar y Pagar</button>
                </div>

                <button class="btn-checkout" id="btn-show-checkout" onclick="showCheckoutForm()">FINALIZAR PEDIDO</button>
            </div>
        </div>

        <!-- Modal de Confirmación de Pedido Exitoso -->
        <div id="success-modal" class="success-modal" style="display:none;">
            <div class="success-modal-content">
                <div class="success-icon">🎉</div>
                <h2>¡Pedido Registrado!</h2>
                <p style="margin-bottom: 1rem;">Presiona el botón de abajo para enviar los detalles de tu pedido a nuestro WhatsApp y completar la entrega.</p>
                <div class="success-details">
                    <p><strong>Total:</strong> <span id="success-total">$0.00</span></p>
                    <p><strong>Método de Pago:</strong> <span id="success-method">-</span></p>
                </div>
                <div class="payment-instructions-box" id="payment-instructions-box">
                    <!-- Dinámico -->
                </div>
                <a id="success-wa-btn" class="btn-primary" href="#" target="_blank" onclick="closeSuccessModal()" style="width:100%; margin-top: 5px; display: block; text-align: center; background: #25D366; box-shadow: 0 4px 15px rgba(37,211,102,0.3); text-decoration: none; border-radius: 8px; box-sizing: border-box; line-height: 1.5; padding: 1rem;">ENVIAR POR WHATSAPP 💬</a>
                <button onclick="closeSuccessModal()" style="color: var(--text-secondary); margin-top: 15px; font-size: 0.85rem; text-decoration: underline; background: none; border: none; cursor: pointer;">Cerrar Ventana</button>
            </div>
        </div>
    `;
    const wrapper = document.createElement('div');
    wrapper.id = 'cart-ui-wrapper';
    wrapper.innerHTML = cartHTML;
    document.body.appendChild(wrapper);

    window.showSuccessModal = function(name, total, payMethod, whatsappUrl) {
        const modal = document.getElementById('success-modal');
        if (!modal) return;
        
        document.getElementById('success-total').innerText = `$${total.toFixed(2)}`;
        document.getElementById('success-method').innerText = payMethod;
        
        const waBtn = document.getElementById('success-wa-btn');
        if (waBtn) waBtn.href = whatsappUrl;
        
        const instructionsBox = document.getElementById('payment-instructions-box');
        
        const instructionsHTML = `
            <h4 style="color:var(--accent-color); font-size:0.95rem; margin-bottom:8px; text-transform:uppercase; text-align: center; letter-spacing: 1px;">Coordinación de Pago</h4>
            <p style="font-size:0.85rem; line-height:1.5; color:var(--text-secondary); margin-bottom:0; text-align: center;">
                Tu pedido se ha registrado bajo el método de pago: <strong>${payMethod}</strong>.<br><br>
                Te facilitaremos los datos bancarios correspondientes y coordinaremos los detalles de entrega de forma privada y directa en el chat de WhatsApp al que te hemos redirigido.
            </p>
        `;
        
        instructionsBox.innerHTML = instructionsHTML;
        modal.style.display = 'flex';
    };

    window.closeSuccessModal = function() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    const openBtn = document.getElementById('open-cart');
    const closeBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');

    if(openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderCartItems();
            drawer.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeCart = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if(closeBtn) closeBtn.onclick = closeCart;
    if(overlay) overlay.onclick = closeCart;

    // Footer dinámico
    const footer = document.createElement('footer');
    footer.style = "text-align: center; padding: 2rem; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4rem; color: var(--text-secondary); font-size: 0.9rem;";
    footer.innerHTML = `&copy; ${new Date().getFullYear()} <span class="footer-store-name">${state.storeConfig?.store_name || 'SHIRT X'}</span>. Todos los derechos reservados.`;
    document.body.appendChild(footer);
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-amount');
    if(!container) return;
    
    if(state.cart.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg"><p>Tu carrito está vacío</p></div>';
        totalElement.innerText = '$0.00';
        return;
    }

    container.innerHTML = '';
    let total = 0;
    state.cart.forEach((item, index) => {
        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;
        total += price * qty;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-img"><img src="${item.image}"></div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>Talla: ${item.size} | Color: ${item.color} | $${price.toFixed(2)}</p>
                <div class="cart-item-controls">
                    <button onclick="changeCartQty(${index}, -1)">-</button>
                    <span>${qty}</span>
                    <button onclick="changeCartQty(${index}, 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart(${index})">✕</button>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });
    totalElement.innerText = `$${total.toFixed(2)}`;
}

window.changeCartQty = (index, delta) => {
    state.cart[index].quantity += delta;
    if(state.cart[index].quantity < 1) removeFromCart(index);
    else { saveCart(); renderCartItems(); updateCartCount(); }
};

window.removeFromCart = (index) => {
    state.cart.splice(index, 1);
    saveCart(); renderCartItems(); updateCartCount();
};

window.showCheckoutForm = function() {
    if(state.cart.length === 0) return window.showToast("El carrito está vacío", "error");
    document.getElementById('checkout-form').style.display = 'block';
    document.getElementById('btn-show-checkout').style.display = 'none';
};

window.submitOrder = async function() {
    if(state.cart.length === 0) return;
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const payMethod = document.getElementById('checkout-payment-method').value;
    
    if(!name || !phone) {
        return window.showToast("Por favor ingresa tu nombre y teléfono", "error");
    }

    if(!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(name)) {
        return window.showToast("El nombre solo debe contener letras y espacios", "error");
    }

    if(name.length < 3) {
        return window.showToast("El nombre debe tener al menos 3 letras", "error");
    }

    if(name.length > 45) {
        return window.showToast("El nombre no debe tener más de 45 caracteres", "error");
    }

    const words = name.split(/\s+/).filter(w => w.length > 0);
    if(words.length > 4) {
        return window.showToast("Por favor ingresa solo tus nombres y apellidos (máx. 4 palabras)", "error");
    }

    if(!payMethod) {
        return window.showToast("Por favor selecciona un método de pago", "error");
    }

    const digits = phone.replace(/\D/g, '');
    
    if (digits.length < 10 || digits.length > 15) {
        return window.showToast("El número de teléfono debe tener entre 10 y 15 dígitos", "error");
    }
    
    if (/^(\d)\1+$/.test(digits)) {
        return window.showToast("Por favor ingresa un número de teléfono válido", "error");
    }
    
    if (digits.startsWith('0') || digits.startsWith('58')) {
        const isLocal = digits.startsWith('0');
        const validPrefixes = ['0412', '0414', '0424', '0416', '0426', '0212', '412', '414', '424', '416', '426', '212'];
        
        const hasValidPrefix = validPrefixes.some(p => {
            if (isLocal) {
                return digits.startsWith(p);
            } else {
                return digits.startsWith('58' + p) || digits.startsWith('580' + p);
            }
        });
        
        if (!hasValidPrefix) {
            return window.showToast("Prefijo de Venezuela no reconocido (usa 0412, 0414, 0424, 0416, 0426 o 0212)", "error");
        }
        
        if (isLocal && digits.length !== 11) {
            return window.showToast("Un número local de Venezuela debe tener exactamente 11 dígitos (ej: 04121234567)", "error");
        }
        if (!isLocal && (digits.length < 12 || digits.length > 13)) {
            return window.showToast("Un número con código de país de Venezuela debe tener 12 o 13 dígitos (ej: 584121234567)", "error");
        }
    }

    let total = 0;
    state.cart.forEach(item => total += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1));

    const dbCustomerName = `${name} (${payMethod})`;

    const orderData = {
        customer_name: dbCustomerName,
        customer_phone: phone,
        items_json: JSON.stringify(state.cart),
        total_price: total
    };

    try {
        const btn = document.getElementById('btn-confirm-order');
        btn.innerText = "Procesando...";
        btn.disabled = true;

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if(res.ok) {
            const cartCopy = [...state.cart];
            
            state.cart = [];
            saveCart();
            renderCartItems();
            updateCartCount();
            
            document.getElementById('cart-drawer').classList.remove('open');
            document.getElementById('cart-overlay').classList.remove('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('checkout-form').style.display = 'none';
            document.getElementById('btn-show-checkout').style.display = 'block';
            
            const waUrl = getWhatsAppUrl(name, total, payMethod, cartCopy);
            
            showSuccessModal(name, total, payMethod, waUrl);
            
            btn.innerText = "Confirmar y Pagar";
            btn.disabled = false;
        } else {
            const errorData = await res.json();
            const errorMsg = errorData.detail || "Error al guardar pedido";
            window.showToast(errorMsg, "error");
            btn.innerText = "Confirmar y Pagar";
            btn.disabled = false;
        }
    } catch(e) {
        window.showToast("Error de conexión", "error");
        document.getElementById('btn-confirm-order').innerText = "Confirmar y Pagar";
        document.getElementById('btn-confirm-order').disabled = false;
    }
};

function getWhatsAppUrl(customerName, totalAmount, payMethod, cartItems) {
    const PHONE_NUMBER = state.storeConfig.whatsapp_number;
    let message = `\u{1F455} *NUEVO PEDIDO - ${state.storeConfig.store_name.toUpperCase()}* \u{1F455}\n\n`;
    message += `\u{1F464} *Cliente:* ${customerName}\n`;
    const phoneInput = document.getElementById('checkout-phone');
    const customerPhone = phoneInput ? phoneInput.value.trim() : '';
    message += `\u{1F4DE} *Teléfono:* ${customerPhone}\n`;
    message += `\u{1F4B3} *Método de Pago:* ${payMethod}\n\n`;
    message += `\u{1F6CD}\u{FE0F} *Detalles del Pedido:*\n`;
    
    const items = cartItems || state.cart;
    items.forEach(item => {
        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;
        message += `- *${qty}x* ${item.name.toUpperCase()} [Talla: ${item.size} | Color: ${item.color}] ($${price.toFixed(2)} c/u)\n`;
    });

    message += `\n\u{1F4B5} *TOTAL A PAGAR: $${totalAmount.toFixed(2)}*\n\n`;
    message += "Hola, acabo de registrar mi pedido en la página web. Quedo atento para coordinar la entrega y el pago. ¡Muchas gracias!";

    const encodedMessage = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodedMessage}`;
}

window.addToCart = (shirtId, btnElement) => {
    const shirt = state.shirts.find(s => s.id === shirtId);
    const sizeSelect = document.getElementById(`size-${shirtId}`);
    const size = sizeSelect ? sizeSelect.value : null;
    
    const colorSelect = document.getElementById(`color-${shirtId}`);
    const color = colorSelect ? colorSelect.value : null;
    
    const qtyInput = document.getElementById(`qty-${shirtId}`);
    const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
    
    if(!size) {
        window.showToast("Por favor, selecciona una talla primero.", "error");
        return;
    }
    
    if(!color) {
        window.showToast("Por favor, selecciona un color primero.", "error");
        return;
    }
    
    const existing = state.cart.find(i => i.id === shirt.id && i.size === size && i.color === color);
    if(existing) existing.quantity += qty;
    else state.cart.push({ id: shirt.id, name: shirt.name, price: shirt.price, size: size, color: color, quantity: qty, image: shirt.image_url });
    
    saveCart(); updateCartCount();
    
    window.showToast(`¡${shirt.name} añadido al carrito!`, "success");
    
    const originalText = btnElement.innerText;
    btnElement.innerText = "¡Añadido!";
    setTimeout(() => btnElement.innerText = originalText, 1000);
};

function updateCartCount() {
    const count = state.cart.reduce((t, i) => t + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.innerText = count);
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(state.cart)); }

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));
    window.scrollObserver = observer;
}
