// Configuración de la API - cargada desde /js/config.js

document.addEventListener("DOMContentLoaded", () => {
    // Si ya tiene un token, lo mandamos al admin directamente
    if (localStorage.getItem("adminToken")) {
        window.location.href = "admin.html";
    }

    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");

    // Cargar nombre de tienda
    fetch(`${API_URL}/settings`)
        .then(res => res.json())
        .then(config => {
            document.title = document.title.replace("SHIRT X", config.store_name);
            const h2 = document.querySelector('.login-container h2');
            if(h2) h2.innerHTML = `${config.store_name}<br><span style="font-size: 1rem; color: var(--text-primary)">Control Panel</span>`;
        })
        .catch(err => console.error(err));

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        
        loginError.style.display = "none";

        try {
            // OAuth2PasswordRequestForm espera los datos como form-urlencoded
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);

            const response = await fetch(`${API_URL}/admin/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem("adminToken", data.access_token);
                // Efecto de transición antes de redirigir
                document.body.style.opacity = "0";
                document.body.style.transition = "opacity 0.5s ease";
                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 500);
            } else {
                loginError.style.display = "block";
                loginError.textContent = "Usuario o contraseña incorrectos.";
            }
        } catch (error) {
            console.error("Error en login:", error);
            loginError.style.display = "block";
            loginError.textContent = "Error de conexión con el servidor.";
        }
    });
});
