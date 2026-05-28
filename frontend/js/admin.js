// Configuración de la API - cargada desde /js/config.js

const adminState = {
    shirts: [],
    categories: [],
    brands: [],
    orders: [],
    salesChart: null,
    topProductsChart: null
};

let orderSearchQuery = '';
let orderStatusFilter = 'ALL';

// --- PROTECCIÓN Y AUTENTICACIÓN ---
const token = localStorage.getItem("adminToken");
if (!token) {
    window.location.href = "admin-login.html";
}

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if(resource.startsWith(API_URL)) {
        config = config || {};
        config.headers = config.headers || {};
        const currentToken = localStorage.getItem("adminToken");
        if(currentToken) {
            config.headers["Authorization"] = `Bearer ${currentToken}`;
        }
    }
    const response = await originalFetch(resource, config);
    if(response.status === 401) {
        localStorage.removeItem("adminToken");
        window.location.href = "admin-login.html";
    }
    return response;
};

window.logoutAdmin = function() {
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
};

// --- SISTEMA DE NOTIFICACIONES TOAST ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : '✕';
    
    toast.innerHTML = `
        <div class="toast-icon" style="font-weight:bold; font-size:1.2rem; color:${type === 'success' ? '#00c853' : '#0066ff'};">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- MODAL DE CONFIRMACIÓN CUSTOM ---
function showConfirm(title, msg, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;
    
    modal.style.display = 'flex';
    
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);
    
    newYes.onclick = () => {
        modal.style.display = 'none';
        onConfirm();
    };
    newNo.onclick = () => modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Iniciando Panel Admin...");
    
    // Vinculación de botones de categorías
    const btnAddCat = document.getElementById('btn-add-category');
    if (btnAddCat) btnAddCat.addEventListener('click', addCategory);

    // Vinculación de botones de marcas
    const btnAddBrand = document.getElementById('btn-add-brand');
    if (btnAddBrand) btnAddBrand.addEventListener('click', addBrand);

    // Formulario de cambio de contraseña
    const formPwd = document.getElementById('form-change-password');
    if (formPwd) {
        formPwd.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-update-pwd');
            const current = document.getElementById('current-password').value;
            const newPwd = document.getElementById('new-password').value;
            
            try {
                btn.innerText = "Actualizando...";
                btn.disabled = true;
                const res = await fetch(`${API_URL}/admin/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password: current, new_password: newPwd })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    showToast("Contraseña actualizada", "success");
                    formPwd.reset();
                } else {
                    showToast(data.detail || "Error al actualizar", "error");
                }
            } catch(err) {
                showToast("Error de conexión", "error");
            } finally {
                btn.innerText = "Actualizar Contraseña";
                btn.disabled = false;
            }
        });
    }

    // Formulario de Ajustes de la Tienda
    const formSettings = document.getElementById('form-store-settings');
    if (formSettings) {
        formSettings.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-update-settings');
            
            try {
                btn.innerText = "Guardando...";
                btn.disabled = true;

                // Subir logo si hay archivo
                const logoFile = document.getElementById('setting-logo-file').files[0];
                let logoUrl = document.getElementById('setting-logo-url').value;
                if (logoFile) {
                    const fd = new FormData();
                    fd.append('files', logoFile);
                    const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
                    if (!uploadRes.ok) throw new Error("Fallo al subir el logo");
                    const uploadData = await uploadRes.json();
                    logoUrl = uploadData.urls[0];
                }

                const data = {
                    store_name: document.getElementById('setting-store-name').value,
                    store_slogan: document.getElementById('setting-store-slogan').value,
                    whatsapp_number: document.getElementById('setting-whatsapp').value.replace(/\D/g, ''),
                    logo_url: logoUrl
                };
                
                const res = await fetch(`${API_URL}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (res.ok) {
                    showToast("Ajustes guardados", "success");
                    await loadSettings();
                } else {
                    showToast("Error al guardar ajustes", "error");
                }
            } catch(err) {
                showToast("Error: " + err.message, "error");
            } finally {
                btn.innerText = "Guardar Ajustes";
                btn.disabled = false;
            }
        });
    }

    // Vinculación de botón de banners
    const btnAddBanner = document.getElementById('btn-add-banner');
    if (btnAddBanner) btnAddBanner.addEventListener('click', addBanner);

    const form = document.getElementById('shoe-form'); // Reusando ID shoe-form
    if (form) form.addEventListener('submit', handleFormSubmit);

    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.addEventListener('input', applyInventoryFilter);
    }

    const brandFilterSelect = document.getElementById('admin-brand-filter');
    if (brandFilterSelect) {
        brandFilterSelect.addEventListener('change', applyInventoryFilter);
    }

    const orderSearch = document.getElementById('order-search');
    if (orderSearch) {
        orderSearch.addEventListener('input', (e) => {
            orderSearchQuery = e.target.value;
            applyOrdersFilterAndSearch();
        });
    }

    // Restaurar pestaña activa
    const activeTab = localStorage.getItem('activeAdminTab');
    if (activeTab) {
        const btn = document.querySelector(`button[onclick*="${activeTab}"]`);
        if (btn) switchTab(activeTab, btn);
    }

    init();
});

async function init() {
    const statusDiv = document.getElementById('connection-status');
    try {
        await loadCategories();
        await loadBrands();
        await loadDashboard();
        await loadAdminBanners();
        await loadAdminOrders();
        await loadSettings();
        if (statusDiv) {
            statusDiv.innerText = "Servidor: En Línea";
            statusDiv.style.background = "#00c853";
        }
    } catch (err) {
        if (statusDiv) {
            statusDiv.innerText = "Servidor: Error de Conexión";
            statusDiv.style.background = "#ff3333";
        }
        showToast("Error al conectar con el servidor", "error");
    }
}

// --- CARGA DE DATOS ---

async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        if(res.ok) {
            const settings = await res.json();
            const nameInput = document.getElementById('setting-store-name');
            const sloganInput = document.getElementById('setting-store-slogan');
            const phoneInput = document.getElementById('setting-whatsapp');
            const logoUrlInput = document.getElementById('setting-logo-url');
            const logoPreview = document.getElementById('current-logo-preview');
            
            if(nameInput) nameInput.value = settings.store_name;
            if(sloganInput) sloganInput.value = settings.store_slogan;
            if(phoneInput) phoneInput.value = settings.whatsapp_number;
            if(logoUrlInput) logoUrlInput.value = settings.logo_url || '';
            
            if(logoPreview) {
                if(settings.logo_url) {
                    logoPreview.innerHTML = `<img src="${settings.logo_url}" style="max-width:100%; max-height:80px; object-fit:contain; border-radius:4px;">`;
                } else {
                    logoPreview.innerHTML = ``;
                }
            }
            
            document.title = document.title.replace("SHIRT X", settings.store_name);

            document.querySelectorAll('.logo a').forEach(el => {
                const textHtml = `<span class="store-name-text">${settings.store_name}</span>`;
                if (settings.logo_url) {
                    el.innerHTML = `<img src="${settings.logo_url}" alt="${settings.store_name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; vertical-align: middle;">${textHtml}`;
                } else {
                    el.innerHTML = textHtml;
                }
            });
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

async function loadDashboard() {
    try {
        const statsRes = await fetch(`${API_URL}/admin/stats`);
        if (!statsRes.ok) return;
        const stats = await statsRes.json();
        
        // Actualizar Tarjetas KPI
        const totalShirtsEl = document.getElementById('stat-total-shirts');
        if (totalShirtsEl) totalShirtsEl.innerText = stats.total_shirts;
        
        const monthlySalesEl = document.getElementById('stat-monthly-sales');
        if (monthlySalesEl) monthlySalesEl.innerText = `$${stats.monthly_sales.toFixed(2)}`;
        
        const monthlyOrdersEl = document.getElementById('stat-monthly-orders');
        if (monthlyOrdersEl) monthlyOrdersEl.innerText = stats.monthly_orders_count;
        
        const criticalStockEl = document.getElementById('stat-critical-stock-count');
        if (criticalStockEl) criticalStockEl.innerText = `${stats.critical_stock.length} prod.`;
        
        // Renderizar Categorías y Marcas
        const catList = document.getElementById('stat-list-categories');
        if (catList) {
            catList.innerHTML = stats.by_category.map(c => `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding:4px 0; font-size: 0.85rem;">
                    <span style="text-transform:capitalize;">${c.name}</span>
                    <span style="color:var(--accent-color); font-weight:bold;">${c.count}</span>
                </div>
            `).join('') || '<p style="color:var(--text-secondary)">No hay datos</p>';
        }

        const brandList = document.getElementById('stat-list-brands');
        if (brandList) {
            brandList.innerHTML = stats.by_brand.map(b => `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding:4px 0; font-size: 0.85rem;">
                    <span style="text-transform:capitalize;">${b.name}</span>
                    <span style="color:var(--accent-color); font-weight:bold;">${b.count}</span>
                </div>
            `).join('') || '<p style="color:var(--text-secondary)">No hay datos</p>';
        }
        
        // Renderizar Gráficas
        renderCharts(stats.sales_history, stats.top_products);
        
        // Renderizar Stock Crítico
        renderCriticalStock(stats.critical_stock);
        
        const shirtsRes = await fetch(`${API_URL}/shirts`);
        adminState.shirts = await shirtsRes.json();
        applyInventoryFilter();
    } catch (err) { console.error(err); }
}

function renderCharts(salesHistory, topProducts) {
    // 1. GRÁFICO DE VENTAS (Línea)
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        if (adminState.salesChart) {
            adminState.salesChart.destroy();
        }

        const labels = salesHistory.map(item => {
            const parts = item.date.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
            return item.date;
        });
        const data = salesHistory.map(item => item.total);

        const ctx = salesCtx.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(0, 102, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 102, 255, 0.0)');

        adminState.salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas ($)',
                    data: data,
                    borderColor: '#0066ff',
                    borderWidth: 3,
                    pointBackgroundColor: '#0066ff',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#121215',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return ` Ventas: $${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8e8e93', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#8e8e93',
                            font: { family: 'Inter', size: 10 },
                            callback: value => `$${value}`
                        }
                    }
                }
            }
        });
    }

    // 2. GRÁFICO DE PRODUCTOS MÁS VENDIDOS (Barras horizontales)
    const topCtx = document.getElementById('topProductsChart');
    if (topCtx) {
        if (adminState.topProductsChart) {
            adminState.topProductsChart.destroy();
        }

        const labels = topProducts.map(p => p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name);
        const data = topProducts.map(p => p.quantity);

        adminState.topProductsChart = new Chart(topCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: data,
                    backgroundColor: 'rgba(0, 102, 255, 0.85)',
                    hoverBackgroundColor: '#0066ff',
                    borderRadius: 4,
                    borderWidth: 0,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#121215',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#8e8e93', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#ffffff', font: { family: 'Inter', size: 10, weight: '500' } }
                    }
                }
            }
        });
    }
}

function renderCriticalStock(criticalStock) {
    const tbody = document.getElementById('critical-stock-table-body');
    if (!tbody) return;

    if (criticalStock.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 1.5rem; font-size: 0.85rem;">
            ✅ Todo el inventario está en niveles óptimos.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = criticalStock.map(item => {
        const sizesBadges = item.low_sizes.map(ls => {
            const badgeBg = ls.stock === 0 ? 'rgba(255, 62, 108, 0.15)' : 'rgba(255, 179, 0, 0.15)';
            const badgeBorder = ls.stock === 0 ? '#ff3e6c' : '#ffb300';
            const badgeText = ls.stock === 0 ? 'Agotado' : `${ls.stock} unids.`;
            return `
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeBorder}; border: 1px solid ${badgeBorder}33; font-size: 0.75rem; font-weight: bold; margin-right: 5px; margin-bottom: 5px;">
                    ${ls.size}: ${badgeText}
                </span>
            `;
        }).join('');

        return `
            <tr>
                <td><img src="${item.image_url}" class="img-preview-mini" onerror="this.src='https://via.placeholder.com/40'"></td>
                <td style="font-weight: 500; font-size: 0.85rem; white-space: normal;">${item.name}</td>
                <td style="text-transform: capitalize; font-size: 0.85rem; color: var(--text-secondary);">${item.brand}</td>
                <td style="white-space: normal;">${sizesBadges}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editShirt(${item.id})" style="padding: 4px 8px; font-size: 0.75rem; margin: 0; display: inline-block; width: auto;">Reabastecer</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/categories`);
        if (!res.ok) return;
        adminState.categories = await res.json();
        const select = document.getElementById('form-category');
        if (select) {
            select.innerHTML = '<option value="" disabled selected>Elegir Categoría...</option>' + 
                adminState.categories.map(c => {
                    const capitalName = c.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return `<option value="${c.name}">${capitalName}</option>`;
                }).join('');
        }
        const list = document.getElementById('categories-list');
        if (list) {
            list.innerHTML = adminState.categories.map(c => `
                <div class="sidebar-btn" style="display:flex; align-items:center; gap: 10px; padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <span style="text-transform: capitalize;">${c.name}</span>
                    <button onclick="deleteCategory(${c.id}, '${c.name}')" style="color:#0066ff; font-weight:bold; background:none; border:none; cursor:pointer;">✕</button>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function loadBrands() {
    try {
        const res = await fetch(`${API_URL}/brands`);
        if (!res.ok) return;
        adminState.brands = await res.json();
        const select = document.getElementById('form-brand');
        if (select) {
            select.innerHTML = '<option value="" disabled selected>Elegir Marca...</option>' + 
                adminState.brands.map(b => {
                    const capitalName = b.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return `<option value="${b.name}">${capitalName}</option>`;
                }).join('');
        }
        const filterSelect = document.getElementById('admin-brand-filter');
        if (filterSelect) {
            const currentSelection = filterSelect.value || 'all';
            filterSelect.innerHTML = '<option value="all">Todas las Marcas</option>' + 
                adminState.brands.map(b => {
                    const capitalName = b.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return `<option value="${b.name}">${capitalName}</option>`;
                }).join('');
            if ([...filterSelect.options].some(opt => opt.value === currentSelection)) {
                filterSelect.value = currentSelection;
            } else {
                filterSelect.value = 'all';
            }
        }
        const list = document.getElementById('brands-list');
        if (list) {
            list.innerHTML = adminState.brands.map(b => `
                <div class="sidebar-btn" style="display:flex; align-items:center; gap: 10px; padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <span style="text-transform: capitalize;">${b.name}</span>
                    <button onclick="deleteBrand(${b.id}, '${b.name}')" style="color:#0066ff; font-weight:bold; background:none; border:none; cursor:pointer;">✕</button>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function addCategory() {
    const nameInput = document.getElementById('new-cat-name');
    let name = nameInput.value.trim();
    if (!name) return showToast("Escribe un nombre de categoría", "error");
    
    name = name.replace(/\s+/g, ' '); 
    const validPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]+$/;
    if (!validPattern.test(name)) {
        return showToast("El nombre solo puede contener letras, números y guiones", "error");
    }

    const lowerName = name.toLowerCase();

    const exists = adminState.categories.some(c => c.name.toLowerCase() === lowerName);
    if (exists) {
        return showToast("La categoría ya existe", "error");
    }

    try {
        const res = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: lowerName })
        });
        if (res.ok) {
            nameInput.value = '';
            await loadCategories();
            await loadDashboard();
            showToast("Categoría añadida correctamente");
        } else {
            showToast("La categoría ya existe", "error");
        }
    } catch (err) { showToast("Error de conexión", "error"); }
}

window.deleteCategory = function(id, name) {
    showConfirm("Eliminar Categoría", `¿Estás seguro de que quieres borrar "${name}"?`, async () => {
        await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
        await loadCategories();
        await loadDashboard();
        showToast("Categoría eliminada");
    });
};

async function addBrand() {
    const nameInput = document.getElementById('new-brand-name');
    let name = nameInput.value.trim();
    if (!name) return showToast("Escribe un nombre de marca", "error");
    
    name = name.replace(/\s+/g, ' '); 
    const validPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]+$/;
    if (!validPattern.test(name)) {
        return showToast("El nombre solo puede contener letras, números y guiones", "error");
    }

    const lowerName = name.toLowerCase();

    const exists = adminState.brands.some(b => b.name.toLowerCase() === lowerName);
    if (exists) {
        return showToast("La marca ya existe", "error");
    }

    try {
        const res = await fetch(`${API_URL}/brands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: lowerName })
        });
        if (res.ok) {
            nameInput.value = '';
            await loadBrands();
            await loadDashboard();
            showToast("Marca añadida correctamente");
        } else {
            showToast("La marca ya existe", "error");
        }
    } catch (err) { showToast("Error de conexión", "error"); }
}

window.deleteBrand = function(id, name) {
    showConfirm("Eliminar Marca", `¿Estás seguro de que quieres borrar "${name}"?`, async () => {
        await fetch(`${API_URL}/brands/${id}`, { method: 'DELETE' });
        await loadBrands();
        await loadDashboard();
        showToast("Marca eliminada");
    });
};

// --- LOGICA DE BANNERS ---
async function loadAdminBanners() {
    try {
        const res = await fetch(`${API_URL}/admin/banners`);
        if (!res.ok) return;
        const banners = await res.json();
        
        const list = document.getElementById('banners-list');
        if (!list) return;
        
        list.innerHTML = banners.map(b => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                <div style="height: 120px; width: 100%; background: #000; position: relative;">
                    <img src="${b.image_url}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;">
                </div>
                <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center; background: var(--surface-color);">
                    <div style="font-weight: 500; font-size: 0.9rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 65%;">${b.title || 'Sin Título'}</div>
                    <button class="btn-action btn-delete" onclick="deleteBanner(${b.id})" style="margin:0;">Borrar</button>
                </div>
            </div>
        `).join('') || '<p style="color:var(--text-secondary); grid-column: 1/-1;">No hay banners activos.</p>';
    } catch (err) { console.error(err); }
}

async function addBanner() {
    const titleInput = document.getElementById('new-banner-title');
    const fileInput = document.getElementById('new-banner-file');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        return showToast("Por favor selecciona una imagen para el banner", "error");
    }

    try {
        const btn = document.getElementById('btn-add-banner');
        btn.innerText = "Subiendo...";
        btn.disabled = true;

        const fd = new FormData();
        fd.append('files', fileInput.files[0]);
        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
        if (!uploadRes.ok) throw new Error("Fallo al subir la imagen");
        const uploadData = await uploadRes.json();
        const imageUrl = uploadData.urls[0];

        const bannerData = {
            image_url: imageUrl,
            title: titleInput.value.trim(),
            is_active: 1
        };

        const res = await fetch(`${API_URL}/banners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData)
        });

        if (res.ok) {
            titleInput.value = '';
            fileInput.value = '';
            document.getElementById('banner-img-status').innerText = 'Ningún archivo seleccionado';
            document.getElementById('banner-img-status').style.color = 'var(--text-secondary)';
            await loadAdminBanners();
            showToast("Banner añadido correctamente");
        }
    } catch (err) {
        showToast("Error al subir el banner", "error");
    } finally {
        const btn = document.getElementById('btn-add-banner');
        btn.innerText = "Subir y Activar";
        btn.disabled = false;
    }
}

window.deleteBanner = function(id) {
    showConfirm("Eliminar Banner", "¿Estás seguro de que quieres borrar este banner de la portada?", async () => {
        await fetch(`${API_URL}/banners/${id}`, { method: 'DELETE' });
        await loadAdminBanners();
        showToast("Banner eliminado");
    });
};

function applyInventoryFilter() {
    const searchInput = document.getElementById('admin-search');
    const brandSelect = document.getElementById('admin-brand-filter');
    
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const brandFilter = brandSelect ? brandSelect.value : 'all';
    
    const filtered = adminState.shirts.filter(s => {
        const matchesQuery = !query || 
            s.name.toLowerCase().includes(query) || 
            s.brand.toLowerCase().includes(query);
            
        const matchesBrand = brandFilter === 'all' || 
            s.brand.toLowerCase() === brandFilter.toLowerCase();
            
        return matchesQuery && matchesBrand;
    });
    
    renderInventory(filtered);
}

function renderInventory(shirts) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = shirts.map(shirt => `
        <tr>
            <td><img src="${shirt.image_url}" class="img-preview-mini" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td style="font-weight: 500;">${shirt.name}</td>
            <td style="text-transform: capitalize;">${shirt.brand}</td>
            <td style="text-transform: capitalize;">${shirt.category}</td>
            <td style="color: var(--accent-color); font-weight: bold;">$${shirt.price.toFixed(2)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editShirt(${shirt.id})">Editar</button>
                <button class="btn-action btn-delete" onclick="deleteShirt(${shirt.id}, '${shirt.name}')">Borrar</button>
            </td>
        </tr>
    `).join('');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const mainFile = document.getElementById('form-image-file').files[0];
    const extraFiles = document.getElementById('form-extra-files').files;
    let mainImageUrl = document.getElementById('form-image-url').value;
    let extraImageUrls = document.getElementById('form-extra-urls').value;

    try {
        if (mainFile) {
            const fd = new FormData();
            fd.append('files', mainFile);
            const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            mainImageUrl = data.urls[0];
        }
        if (extraFiles.length > 0) {
            const fd = new FormData();
            for (let f of extraFiles) fd.append('files', f);
            const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            extraImageUrls = data.urls.join(',');
        }

        const shirtData = {
            name: document.getElementById('form-name').value,
            brand: document.getElementById('form-brand').value,
            category: document.getElementById('form-category').value,
            price: parseFloat(document.getElementById('form-price').value),
            description: document.getElementById('form-description').value,
            sizes: parseSizesForm(),
            colors: document.getElementById('form-colors').value.trim(),
            image_url: mainImageUrl,
            additional_images: extraImageUrls
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/shirts/${id}` : `${API_URL}/shirts`;
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shirtData)
        });

        if (res.ok) {
            closeModal();
            await loadDashboard();
            showToast("¡Camisa guardada correctamente!");
        }
    } catch (err) { showToast("Error al guardar", "error"); }
}

window.editShirt = function(id) {
    const shirt = adminState.shirts.find(s => s.id === id);
    if (!shirt) return;
    
    document.getElementById('edit-id').value = shirt.id;
    document.getElementById('form-name').value = shirt.name;
    document.getElementById('form-brand').value = shirt.brand;
    document.getElementById('form-category').value = shirt.category;
    document.getElementById('form-price').value = shirt.price;
    document.getElementById('form-description').value = shirt.description;
    
    // Poblar las filas de tallas
    document.getElementById('size-inventory-container').innerHTML = '';
    try {
        const sizesObj = JSON.parse(shirt.sizes);
        for (const [size, qty] of Object.entries(sizesObj)) {
            addSizeRow(size, qty);
        }
    } catch(e) {
        if(shirt.sizes) {
            shirt.sizes.split(',').forEach(s => addSizeRow(s.trim(), 1));
        }
    }

    document.getElementById('form-colors').value = shirt.colors || "";
    document.getElementById('form-image-url').value = shirt.image_url;
    document.getElementById('form-extra-urls').value = shirt.additional_images || "";
    
    renderEditPreviews(shirt.image_url, shirt.additional_images);

    document.getElementById('modal-title').innerText = "Editar Camisa";
    openModal();
};

function renderEditPreviews(mainUrl, extraUrlsString) {
    const previewContainer = document.getElementById('edit-previews');
    if (!previewContainer) return;
    
    let html = `<div style="margin-bottom:1rem;">
                    <p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:5px;">Foto Principal Actual:</p>
                    <div style="position:relative; width:60px; height:60px;">
                        <img src="${mainUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:4px; border:1px solid var(--accent-color);">
                    </div>
                </div>`;
    
    if (extraUrlsString) {
        html += `<p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:5px;">Fotos Extra (Toca la ✕ para quitar):</p>
                 <div style="display:flex; gap:10px; flex-wrap:wrap;">`;
        
        const extraUrls = extraUrlsString.split(',').filter(url => url.trim() !== "");
        extraUrls.forEach((url, index) => {
            html += `
                <div style="position:relative; width:50px; height:50px;">
                    <img src="${url.trim()}" style="width:100%; height:100%; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                    <button type="button" onclick="removeExtraImage('${url.trim()}')" 
                            style="position:absolute; top:-5px; right:-5px; background:#0066ff; color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.5);">✕</button>
                </div>`;
        });
        html += `</div>`;
    }
    
    previewContainer.innerHTML = html;
    previewContainer.style.display = 'block';
}

window.removeExtraImage = function(urlToRemove) {
    const input = document.getElementById('form-extra-urls');
    let urls = input.value.split(',').filter(url => url.trim() !== "" && url.trim() !== urlToRemove);
    input.value = urls.join(',');
    
    const mainUrl = document.getElementById('form-image-url').value;
    renderEditPreviews(mainUrl, input.value);
    showToast("Foto quitada de la lista (Recuerda Guardar)");
};

window.deleteShirt = function(id, name) {
    showConfirm("Eliminar Camisa", `¿Estás seguro de que quieres borrar el modelo "${name}"?`, async () => {
        await fetch(`${API_URL}/shirts/${id}`, { method: 'DELETE' });
        await loadDashboard();
        showToast("Camisa eliminada correctamente");
    });
};

window.updateFileName = function(input, statusId) {
    const status = document.getElementById(statusId);
    if (input.files && input.files.length > 0) {
        status.innerText = input.files.length === 1 ? `📄 ${input.files[0].name}` : `🗂️ ${input.files.length} seleccionados`;
        status.style.color = "var(--accent-color)";
    }
};

window.openModal = () => document.getElementById('shoe-modal').style.display = 'block';

window.closeModal = () => {
    document.getElementById('shoe-modal').style.display = 'none';
    document.getElementById('shoe-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('main-img-status').innerText = "Ningún archivo seleccionado";
    document.getElementById('extra-img-status').innerText = "0 archivos seleccionados";
    const previews = document.getElementById('edit-previews');
    if (previews) previews.innerHTML = "";
    document.getElementById('size-inventory-container').innerHTML = '';
};

// --- LOGICA DE TALLAS E INVENTARIO ---
window.addSizeRow = function(sizeVal = '', qtyVal = 1) {
    const container = document.getElementById('size-inventory-container');
    const rowId = 'size-row-' + Date.now() + Math.floor(Math.random() * 1000);
    const row = document.createElement('div');
    row.id = rowId;
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '8px';
    
    const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const optionsHtml = sizes.map(sz => {
        const selected = sz === sizeVal.toUpperCase() ? 'selected' : '';
        return `<option value="${sz}" ${selected} style="background:#121215; color:white;">${sz}</option>`;
    }).join('');

    row.innerHTML = `
        <select class="size-input" required style="flex: 2; padding: 0.8rem; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; outline:none; height: 50px;">
            <option value="" disabled ${!sizeVal ? 'selected' : ''} style="background:#121215; color:white;">Talla...</option>
            ${optionsHtml}
        </select>
        <input type="number" placeholder="Cant." value="${qtyVal}" class="qty-input" required min="0" style="flex: 1; padding: 0.8rem; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; outline:none; height: 50px;">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" style="background:#0066ff; color:white; border:none; border-radius:4px; padding:0 15px; cursor:pointer; font-weight: bold; height: 50px;">✕</button>
    `;
    container.appendChild(row);
};

window.parseSizesForm = function() {
    const container = document.getElementById('size-inventory-container');
    const rows = container.querySelectorAll('div[id^="size-row-"]');
    let inventory = {};
    rows.forEach(row => {
        const size = row.querySelector('.size-input').value.trim().toUpperCase();
        const qty = parseInt(row.querySelector('.qty-input').value) || 0;
        if(size) {
            inventory[size] = (inventory[size] || 0) + qty;
        }
    });
    return JSON.stringify(inventory);
};

// --- LOGICA DE PESTAÑAS (TABS) ---
window.switchTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
        el.style.background = 'none';
    });
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.style.display = 'block';
    
    if (btnElement) {
        btnElement.classList.add('active');
        btnElement.style.background = 'rgba(255,255,255,0.05)';
    }

    localStorage.setItem('activeAdminTab', tabId);
};

// --- LOGICA DE PEDIDOS ---
window.loadAdminOrders = async function() {
    try {
        const res = await fetch(`${API_URL}/admin/orders`);
        if (!res.ok) return;
        adminState.orders = await res.json();
        applyOrdersFilterAndSearch();
    } catch (err) {
        console.error("Error loading orders:", err);
    }
};

function renderAdminOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    if(!tbody) return;
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No se encontraron pedidos.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        let badgeColor = "#ffb300";
        if(order.status === "Completado") badgeColor = "#00c853";
        if(order.status === "Cancelado") badgeColor = "#0066ff";
        
        const items = JSON.parse(order.items_json);
        const itemsDesc = items.map(i => `${i.quantity}x ${i.name} (Talla: ${i.size} | Color: ${i.color})`).join('<br>');
        
        const date = new Date(order.created_at).toLocaleString();

        return `
            <tr>
                <td>
                    <strong style="color:white;">${order.customer_name}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">${date}</span>
                </td>
                <td>${order.customer_phone}</td>
                <td><strong style="color:var(--accent-color);">$${order.total_price.toFixed(2)}</strong></td>
                <td style="width: 120px;">
                    <span style="display: inline-block; width: 95px; text-align: center; background: rgba(255,255,255,0.05); color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; border: 1px solid ${badgeColor}33;">
                        ${order.status}
                    </span>
                </td>
                <td style="min-width: 140px;">
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" onclick="updateOrderStatus(${order.id}, 'Completado')" title="Marcar Completado" style="background: #00c853; border:none; border-radius:4px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; cursor:pointer; color:white; font-weight:bold;">✓</button>
                        <button type="button" onclick="updateOrderStatus(${order.id}, 'Pendiente')" title="Marcar Pendiente" style="background: #ffb300; border:none; border-radius:4px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; cursor:pointer; color:white; font-weight:bold;">⏳</button>
                        <button type="button" onclick="deleteOrder(${order.id})" title="Cancelar y Borrar" style="background: #0066ff; border:none; border-radius:4px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; cursor:pointer; color:white; font-weight:bold;">✕</button>
                    </div>
                </td>
            </tr>
            <tr style="border-bottom: 2px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.15);">
                <td colspan="5" style="padding-top:0; font-size:0.85rem; color:var(--text-secondary); white-space: normal;">
                    <em>Artículos:</em><br> ${itemsDesc}
                </td>
            </tr>
        `;
    }).join('');
}

function applyOrdersFilterAndSearch() {
    let filtered = [...adminState.orders];
    
    if (orderStatusFilter === 'PENDING') {
        filtered = filtered.filter(o => o.status === 'Pendiente');
    } else if (orderStatusFilter === 'COMPLETED') {
        filtered = filtered.filter(o => o.status === 'Completado');
    }
    
    if (orderSearchQuery) {
        const query = orderSearchQuery.toLowerCase();
        filtered = filtered.filter(o => 
            (o.customer_name && o.customer_name.toLowerCase().includes(query)) || 
            (o.customer_phone && o.customer_phone.toLowerCase().includes(query))
        );
    }
    
    renderAdminOrders(filtered);
}

window.filterOrders = function(status, btnElement) {
    orderStatusFilter = status;
    
    document.querySelectorAll('.btn-filter').forEach(el => {
        el.classList.remove('active');
        el.style.background = 'none';
    });
    
    if (btnElement) {
        btnElement.classList.add('active');
        btnElement.style.background = 'var(--accent-color)';
    }
    
    applyOrdersFilterAndSearch();
};

window.updateOrderStatus = async function(id, status) {
    try {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if(res.ok) {
            showToast(`Estado cambiado a ${status}`, "success");
            loadAdminOrders();
        } else {
            showToast("Error al actualizar pedido", "error");
        }
    } catch(err) {
        showToast("Error de conexión", "error");
    }
};

window.deleteOrder = function(id) {
    showConfirm(
        "¿Cancelar y Borrar Pedido?", 
        "Esto borrará el pedido permanentemente y devolverá los productos al inventario.", 
        async () => {
            try {
                const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
                if(res.ok) {
                    showToast("Pedido cancelado e inventario restaurado", "success");
                    loadAdminOrders();
                    loadDashboard();
                } else {
                    showToast("Error al cancelar", "error");
                }
            } catch(err) {
                showToast("Error de conexión", "error");
            }
        }
    );
};
