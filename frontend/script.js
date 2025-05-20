// Definición de variables globales
let cartItems = [];
try {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Ensure that the parsed data is an array
        if (Array.isArray(parsedCart)) {
            cartItems = parsedCart;
        } else {
            console.warn("Cart data in localStorage was not an array, resetting cart.");
            cartItems = [];
            localStorage.setItem("cart", JSON.stringify([])); // Optional: clear invalid storage
        }
    }
} catch (error) {
    console.error("Error parsing cart from localStorage:", error);
    cartItems = []; // Default to empty cart on error
    localStorage.setItem("cart", JSON.stringify([])); // Optional: clear invalid storage
}
let totalAmount = 0;
// Update this line to match your Django server's address
const API_URL = 'https://backend-33hb.onrender.com/api/';
//const shippingCost = 5000;

// Objeto para representar el pedido
const order = {
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    products: [],
    totalAmount: 0
};

// Función para desplazarse suavemente a una sección
function scrollToSection(id) {
    const section = document.getElementById(id);
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    }
}

// Función para mostrar mensajes de error
function showErrorMessage(message, container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="retryLoadMenu()" class="retry-btn">
            <i class="fas fa-redo"></i> Reintentar
        </button>
    `;
    container.innerHTML = '';
    container.appendChild(errorDiv);
}

// Función para reintentar cargar el menú
async function retryLoadMenu() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    await loadMenu();
}

// Función de utilidad para manejar peticiones HTTP
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

    try {
        console.log('Iniciando petición a:', url);
        console.log('Opciones de la petición:', {
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body ? JSON.parse(options.body) : undefined
        });

        // Obtener el token si existe
        const user = JSON.parse(localStorage.getItem('user'));
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Agregar el token de autenticación si existe y no es una petición de login
        if (user && user.token && !url.includes('auth/login')) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }

        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: headers,
            mode: 'cors',
            credentials: 'include'
        });

        clearTimeout(timeoutId);

        console.log('Respuesta recibida:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        // Verificar el tipo de contenido de la respuesta
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Respuesta no-JSON recibida:', {
                contentType,
                status: response.status,
                statusText: response.statusText
            });
            throw new Error('El servidor devolvió una respuesta no-JSON. Por favor, intenta nuevamente.');
        }

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                console.error('Error al parsear respuesta de error:', e);
                errorData = { error: `Error del servidor: ${response.status} ${response.statusText}` };
            }
            
            console.error('Error en la respuesta:', errorData);
            
            // Si el error es de autenticación, redirigir al login
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }
            
            throw new Error(errorData.error || errorData.detail || `Error del servidor: ${response.status} ${response.statusText}`);
        }

        // Intentar parsear la respuesta como JSON
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Error al parsear respuesta JSON:', e);
            throw new Error('Error al procesar la respuesta del servidor');
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error en fetchWithTimeout:', {
            url,
            error: error.message,
            type: error.name,
            stack: error.stack
        });
        
        if (error.name === 'AbortError') {
            throw new Error('La petición tardó demasiado tiempo en completarse');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor esté corriendo en ' + API_URL);
        }
        throw error;
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
        <p>${message}</p>
    `;
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 100);

    // Remover después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Función para cargar el menú desde el servidor usando fetch
async function loadMenu() {
    const menuContainers = document.querySelectorAll('.menu-items');
    
    try {
        // Mostrar indicador de carga
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        console.log('Intentando cargar el menú desde:', `${API_URL}platos/`);
        
        const response = await fetch(`${API_URL}platos/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
        
        console.log('Respuesta del servidor:', {
            status: response.status,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Datos recibidos:', responseData);
        
        if (!responseData || !responseData.data) {
            throw new Error('Formato de respuesta inválido');
        }
        
        const menuData = responseData.data;
        
        if (!Array.isArray(menuData)) {
            throw new Error('Los datos recibidos no son un array');
        }
        
        if (menuData.length === 0) {
            showNotification('No hay platos disponibles en el menú', 'warning');
        }

        // Mostrar el menú en la página
        displayMenu(menuData);
        showNotification('Menú cargado exitosamente', 'success');

    } catch (error) {
        console.error('Error al cargar el menú:', error);
        
        let errorMessage = 'Error al cargar el menú. ';
        
        if (error.name === 'AbortError') {
            errorMessage += 'La solicitud tardó demasiado. Por favor, verifica tu conexión a internet.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'No se pudo conectar con el servidor. Por favor, verifica que el servidor esté corriendo en ' + API_URL;
        } else {
            errorMessage += error.message;
        }

        showNotification(errorMessage, 'error');

        // Mostrar mensaje de error en cada contenedor de menú
        menuContainers.forEach(container => {
            showErrorMessage(errorMessage, container);
        });

    } finally {
        // Ocultar indicador de carga
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Función para mostrar el menú en la página
function displayMenu(menuData) {
    // Obtener las categorías del menú
    const categories = {
        'entradas': document.querySelector('#entradas .menu-items'),
        'principales': document.querySelector('#principales .menu-items'),
        'bebidas': document.querySelector('#bebidas .menu-items'),
        'postres': document.querySelector('#postres .menu-items')
    };
    
    // Limpiar los contenedores
    Object.values(categories).forEach(container => {
        if (container) container.innerHTML = '';
    });
    
    // Verificar si menuData es un array
    if (!Array.isArray(menuData)) {
        console.error('menuData no es un array:', menuData);
        return;
    }
    
    // Llenar cada categoría con sus productos
    menuData.forEach(item => {
        const category = categories[item.categoria ? item.categoria.toLowerCase() : 'principales'];
        if (category) {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            
            // Procesar la ruta de la imagen
            let imageUrl = item.imagen || 'https://via.placeholder.com/150';
            
            // Debug log para ver la ruta original
            console.log('Ruta original de imagen:', imageUrl);
            
            // Simplificar el manejo de rutas
            if (imageUrl.startsWith('static/')) {
                imageUrl = imageUrl.replace('static/', '');
            }
            
            // Asegurarnos de que la ruta sea relativa a la carpeta Assets
            if (!imageUrl.startsWith('http')) {
                imageUrl = `Assets/${imageUrl.split('/').pop()}`;
            }
            
            // Debug log para ver la ruta final
            console.log('Ruta final de imagen:', imageUrl);
            
            menuItem.innerHTML = `
                <img src="${imageUrl}" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/150?text=Imagen+no+disponible'">
                <h4>${item.nombre}</h4>
                <p>${item.descripcion || ''}</p>
                <p class="price">$${parseFloat(item.precio).toFixed(2)}</p>
                <div class="controls">
                    <button class="decrease control-btn">-</button>
                    <input type="text" value="1" readonly>
                    <button class="increase control-btn">+</button>
                </div>
                <button class="add-to-cart" data-id="${item.id}">
                    <i class="fas fa-shopping-cart"></i> Agregar al carrito
                </button>
            `;
            
            // Agregar eventos a los botones de cantidad
            const quantityInput = menuItem.querySelector("input");
            menuItem.querySelector(".increase").addEventListener("click", () => {
                quantityInput.value = parseInt(quantityInput.value) + 1;
            });
            
            menuItem.querySelector(".decrease").addEventListener("click", () => {
                if (parseInt(quantityInput.value) > 1) {
                    quantityInput.value = parseInt(quantityInput.value) - 1;
                }
            });
            
            // Agregar evento al botón de agregar al carrito
            menuItem.querySelector(".add-to-cart").addEventListener("click", () => {
                addToCart(item.id, item.nombre, item.precio, parseInt(quantityInput.value));
            });
            
            category.appendChild(menuItem);
        }
    });
}

// Función para agregar un producto al carrito
function addToCart(productId, productName, price, quantity = 1) {
    if (!productId) {
        console.error('Error: No se proporcionó un ID válido para el producto');
        showNotification('Error al agregar el producto al carrito', 'error');
        return;
    }

    // Verificar si el producto ya está en el carrito
    const existingProductIndex = cartItems.findIndex(item => item.id === productId);
    
    if (existingProductIndex !== -1) {
        // Si el producto ya está en el carrito, aumentar la cantidad
        cartItems[existingProductIndex].quantity += quantity;
    } else {
        // Si el producto no está en el carrito, agregarlo
        cartItems.push({
            id: productId,
            name: productName,
            price: price,
            quantity: quantity
        });
    }
    
    // Guardar en localStorage
    localStorage.setItem("cart", JSON.stringify(cartItems));
    
    // Actualizar el contador del carrito
    updateCartCount();
    
    // Actualizar el total
    updateCartTotal();
    
    // Actualizar la vista del carrito
    displayCart();

    // Mostrar notificación de éxito
    showNotification('Producto agregado al carrito', 'success');
}

// Función para actualizar el contador del carrito
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Función para eliminar un producto del carrito
function removeFromCart(productId) {
    // Encontrar el índice del producto en el carrito
    const productIndex = cartItems.findIndex(item => (item.id || item.producto) === productId);
    
    if (productIndex !== -1) {
        // Si la cantidad es mayor a 1, disminuir la cantidad
        if (cartItems[productIndex].quantity > 1) {
            cartItems[productIndex].quantity -= 1;
        } else {
            // Si la cantidad es 1, eliminar el producto del carrito
            cartItems.splice(productIndex, 1);
        }
        
        // Guardar en localStorage
        localStorage.setItem("cart", JSON.stringify(cartItems));
        
        // Actualizar el contador del carrito
        updateCartCount();
        
        // Actualizar el total
        updateCartTotal();
        
        // Actualizar la vista del carrito
        displayCart();
    }
}

// Función para actualizar el total del carrito
function updateCartTotal() {
    totalAmount = cartItems.reduce((total, item) => total + ((item.price || item.precio) * item.quantity), 0);
    
    // Actualizar el total en la vista
    if (document.getElementById('cart-total')) {
        document.getElementById('cart-total').textContent = `$${totalAmount.toFixed(2)}`;
    }
    
    // Actualizar otros elementos del total si existen
    if (document.getElementById('val_t_prodcut')) {
        document.getElementById('val_t_prodcut').textContent = `$${totalAmount.toLocaleString()}`;
    }
    
    
    if (document.getElementById('total-price')) {
        document.getElementById('total-price').textContent = `$${(totalAmount).toLocaleString()}`;
    }
}

// Función para mostrar los productos en el carrito
function displayCart() {
    const cartContainer = document.getElementById('cart-items');
    const productList = document.getElementById('product-list');

    if (cartContainer) {
        cartContainer.innerHTML = ''; // Clear previous items

        if (cartItems.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío</p>';
        } else {
            cartItems.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');

                // Robust property access with fallbacks
                const itemName = item.name || item.producto || 'Producto Desconocido';
                const itemPrice = parseFloat(item.price || item.precio || 0);
                const itemQuantity = parseInt(item.quantity || 0); // Ensure quantity is a valid number

                // Ensure quantity is at least 1 if item exists, or handle as error if 0
                if (itemQuantity <= 0) {
                    console.warn(`Cart item "${itemName}" has invalid quantity: ${item.quantity}. Skipping.`);
                    return; // Skip rendering this item or handle appropriately
                }

                itemElement.innerHTML = `
                    <div class="cart-item-info">
                        <span class="cart-item-name">${itemName}</span>
                        <div class="cart-item-price">$${itemPrice.toFixed(2)}</div>
                        <div class="cart-item-quantity">Cantidad: ${itemQuantity}</div>
                    </div>
                    <div class="cart-item-actions">
                        <button data-index="${index}" class="decrease">-</button>
                        <button data-index="${index}" class="increase">+</button>
                        <button data-index="${index}" class="remove">×</button>
                    </div>
                `;
                cartContainer.appendChild(itemElement);
            });
        }
    }

    // Actualizar también la visualización para la página de carrito
    if (productList) {
        productList.innerHTML = ''; // Clear previous items

        if (cartItems.length === 0) {
            // productList.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
        } else {
            cartItems.forEach((item, index) => {
                const itemElement = document.createElement("div");
                itemElement.classList.add("product");

                // Robust property access with fallbacks
                const itemName = item.name || item.producto || 'Producto Desconocido';
                const itemPrice = parseFloat(item.price || item.precio || 0);
                const itemQuantity = parseInt(item.quantity || 0);
                let imageUrl = item.imagen || item.image || 'https://via.placeholder.com/150';
                if (imageUrl.startsWith('frontend/')) {
                    imageUrl = imageUrl.replace('frontend/', '');
                }

                if (itemQuantity <= 0) {
                    console.warn(`Cart page item "${itemName}" has invalid quantity: ${item.quantity}. Skipping.`);
                    return; 
                }

                itemElement.dataset.name = itemName;
                itemElement.dataset.price = itemPrice;

                itemElement.innerHTML = `
                    <img src="${imageUrl}" alt="${itemName}">
                    <p>${itemName}</p>
                    <p>Precio Unitario: $${itemPrice.toLocaleString()}</p>
                    <div class="controls">
                        <button class="decrease" data-index="${index}">-</button>
                        <input type="text" value="${itemQuantity}" readonly>
                        <button class="increase" data-index="${index}">+</button>
                    </div>
                    <button class="remove" data-index="${index}">Eliminar</button>
                `;
                productList.appendChild(itemElement);
            });
        }
    }
}

// Función para enviar el pedido al servidor
async function submitOrder(orderData) {
    try {
        console.log('Enviando pedido al servidor:', orderData);

        const response = await fetch(`${API_URL}pedidos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                cliente: orderData.cliente,
                telefono: orderData.telefono,
                direccion: orderData.direccion,
                platos: orderData.platos.map(item => ({
                    plato_id: item.plato_id,
                    cantidad: item.cantidad
                }))
            }),
            mode: 'cors',
            credentials: 'omit' // Cambiado a 'omit' para no enviar credenciales
        });

        console.log('Respuesta del servidor:', {
            status: response.status,
            statusText: response.statusText
        });
        
        let responseData;
        try {
            responseData = await response.json();
            console.log('Datos de respuesta:', responseData);
        } catch (e) {
            console.error('Error al procesar la respuesta:', e);
            throw new Error('Error al procesar la respuesta del servidor: ' + e.message);
        }

        if (!response.ok) {
            throw new Error(responseData?.error || responseData?.detail || `Error del servidor: ${response.status} ${response.statusText}`);
        }

        if (!responseData || !responseData.id) {
            console.error('Respuesta inválida:', responseData);
            throw new Error('Respuesta inválida del servidor: No se recibió un ID de pedido');
        }

        return { success: true, orderId: responseData.id };
    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        console.error('Detailed error:', error.message, error.stack);
        throw new Error(error.message || 'No se pudo procesar el pedido. Por favor, intenta nuevamente.');
    }
}

// Función para finalizar el pedido
async function checkout() {
    try {
        // Obtener datos del formulario
        const customerName = document.getElementById('customer-name')?.value?.trim() || 
                            document.getElementById('address')?.value?.trim() || '';
        const customerPhone = document.getElementById('customer-phone')?.value?.trim() || 
                            document.getElementById('phone')?.value?.trim() || '';
        const customerAddress = document.getElementById('customer-address')?.value?.trim() || 
                                document.getElementById('apartment')?.value?.trim() || '';
        
        // Validar que haya productos y datos de cliente
        if (cartItems.length === 0) {
            showNotification('Tu carrito está vacío. Agrega algunos productos antes de realizar el pedido.', 'error');
            return;
        }
        
        // Validar datos del cliente
        const validationErrors = [];
        if (!customerName) validationErrors.push('El nombre es requerido');
        if (!customerPhone) validationErrors.push('El teléfono es requerido');
        if (!customerAddress) validationErrors.push('La dirección es requerida');
        
        if (validationErrors.length > 0) {
            showNotification(validationErrors.join('. '), 'error');
            return;
        }
        
        // Preparar el objeto de pedido en el formato que espera el backend
        const orderData = {
            cliente: customerName,
            telefono: customerPhone,
            direccion: customerAddress,
            platos: cartItems.map(item => ({
                plato_id: parseInt(item.id),
                cantidad: parseInt(item.quantity)
            }))
        };

        console.log('Enviando pedido:', orderData);

        // Mostrar indicador de carga
        const submitButton = document.getElementById('submit-order');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Procesando...';
        }

        try {
            // Enviar el pedido al servidor
            const result = await submitOrder(orderData);
            
            if (result.success) {
                showNotification(`¡Gracias por tu pedido! Tu orden #${result.orderId} ha sido procesada.`, 'success');
                
                // Mostrar resumen final si estamos en la página de carrito
                const cartSummary = document.querySelector(".cart-summary");
                if (cartSummary) {
                    const finalSummary = document.createElement("div");
                    finalSummary.classList.add("final-summary");
                    finalSummary.innerHTML = `
                        <h2>Resumen Final de Compra</h2>
                        <p>Productos: ${cartItems.reduce((total, item) => total + item.quantity, 0)}</p>
                        <p>Total producto: $${totalAmount.toLocaleString()}</p>
                        <p>Total: $${(totalAmount).toLocaleString()}</p>
                    `;
                    cartSummary.appendChild(finalSummary);
                }
                
                // Limpiar carrito
                clearCart();
                
                // Cerrar modal si existe
                const checkoutModal = document.getElementById('checkout-modal');
                if (checkoutModal) {
                    checkoutModal.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error en checkout:', error);
            showNotification(error.message, 'error');
        } finally {
            // Restaurar botón de submit
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Confirmar Pedido';
            }
        }
    } catch (error) {
        console.error('Error en checkout:', error);
        showNotification(error.message, 'error');
    }
}

// Función para limpiar el carrito
function clearCart() {
    cartItems = [];
    localStorage.removeItem("cart");
    totalAmount = 0;
    updateCartCount();
    displayCart();
    updateCartTotal();
    
    // Limpiar campos del formulario si existen
    if (document.getElementById('address')) document.getElementById('address').value = '';
    if (document.getElementById('apartment')) document.getElementById('apartment').value = '';
    if (document.getElementById('phone')) document.getElementById('phone').value = '';
    if (document.getElementById('customer-name')) document.getElementById('customer-name').value = '';
    if (document.getElementById('customer-phone')) document.getElementById('customer-phone').value = '';
    if (document.getElementById('customer-address')) document.getElementById('customer-address').value = '';
}

// Togglear la visibilidad del carrito
function toggleCart() {
    const cart = document.getElementById('shopping-cart');
    if (cart) {
        cart.classList.toggle('active');
    }
}

// Función para mostrar/ocultar el modal de checkout
function toggleCheckoutModal(show = true) {
    console.log('toggleCheckoutModal called with show:', show);
    const modal = document.getElementById('checkout-modal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    if (show) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        updateOrderSummary();
        console.log('Modal should be visible now');
    } else {
        modal.style.display = 'none';
        modal.classList.remove('active');
        console.log('Modal should be hidden now');
    }
}

// Función para actualizar el resumen de la orden
function updateOrderSummary() {
    console.log('Updating order summary');
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalElement = document.getElementById('order-total');
    
    if (!orderItemsContainer || !orderTotalElement) {
        console.error('Order summary elements not found');
        return;
    }
    
    orderItemsContainer.innerHTML = '';
    
    cartItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('order-item');
        itemElement.innerHTML = `
            <span>${item.name || item.producto} x ${item.quantity}</span>
            <span>$${((item.price || item.precio) * item.quantity).toFixed(2)}</span>
        `;
        orderItemsContainer.appendChild(itemElement);
    });
    
    orderTotalElement.textContent = `$${totalAmount.toFixed(2)}`;
    console.log('Order summary updated');
}

// Event listener para el botón de checkout
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Solo buscar el botón de checkout si estamos en la página principal o carrito
    if (window.location.pathname.includes('main.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        const checkoutBtn = document.getElementById('checkout');
        if (checkoutBtn) {
            console.log('Checkout button found');
            checkoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Checkout button clicked');
                toggleCheckoutModal(true);
            });
        }

        // Event listener para cerrar el modal
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            console.log('Close modal button found');
            closeModalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close modal button clicked');
                toggleCheckoutModal(false);
            });
        }

        // Event listener para enviar el pedido
        const submitOrderBtn = document.getElementById('submit-order');
        if (submitOrderBtn) {
            console.log('Submit order button found');
            submitOrderBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Submit order button clicked');
                checkout();
            });
        }

        // Event listener para cerrar el modal al hacer clic fuera
        document.addEventListener('click', function(event) {
            const modal = document.getElementById('checkout-modal');
            const modalContent = document.querySelector('.modal-content');
            const checkoutBtn = document.getElementById('checkout');
            
            if (!modal || !modalContent) {
                return;
            }
            
            // Si el modal está visible y el clic fue fuera del contenido del modal
            if (modal.style.display === 'flex' && 
                !modalContent.contains(event.target) && 
                event.target !== checkoutBtn) {
                console.log('Click outside modal detected');
                toggleCheckoutModal(false);
            }
        });
    }
});

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar el menú desde el servidor si estamos en la página principal
    if (window.location.pathname.includes('main.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        loadMenu();
    }
    
    // Inicializar el carrito desde localStorage
    updateCartCount();
    displayCart();
    updateCartTotal();
    
    // Event listener para mostrar/ocultar el carrito
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', toggleCart);
    }
    
    // Event listener para cerrar el carrito
    const closeCartBtn = document.getElementById('close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', toggleCart);
    }
    
    // Event listener para limpiar el carrito
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    
    // Event listener para los botones del carrito (aumentar, disminuir, eliminar)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('increase')) {
            const index = e.target.dataset.index;
            if (index !== undefined) {
                cartItems[index].quantity++;
                localStorage.setItem("cart", JSON.stringify(cartItems));
                updateCartCount();
                updateCartTotal();
                displayCart();
            }
        } else if (e.target.classList.contains('decrease')) {
            const index = e.target.dataset.index;
            if (index !== undefined) {
                if (cartItems[index].quantity > 1) {
                    cartItems[index].quantity--;
                } else {
                    cartItems.splice(index, 1);
                }
                localStorage.setItem("cart", JSON.stringify(cartItems));
                updateCartCount();
                updateCartTotal();
                displayCart();
            }
        } else if (e.target.classList.contains('remove')) {
            const index = e.target.dataset.index;
            if (index !== undefined) {
                cartItems.splice(index, 1);
                localStorage.setItem("cart", JSON.stringify(cartItems));
                updateCartCount();
                updateCartTotal();
                displayCart();
            }
        }
    });
    
    // Event listener para el botón de checkout
    const checkoutPageBtn = document.querySelector('.checkout');
    if (checkoutPageBtn) {
        checkoutPageBtn.addEventListener('click', checkout);
    }
    
    // Event listener para limpiar carrito en la página de carrito
    const clearCartPageBtn = document.querySelector('.limpiar_ca');
    if (clearCartPageBtn) {
        clearCartPageBtn.addEventListener('click', clearCart);
    }
    
    // Event listeners para links de navegación suave
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            scrollToSection(target);
        });
    });

    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            await login(username, password);
        });
    }

    const fetchOrdersButton = document.getElementById('fetch-orders-button');
    if (fetchOrdersButton) {
        fetchOrdersButton.addEventListener('click', fetchOrderData);
    }
});

// Funciones de autenticación
async function login(username, password) {
    try {
        console.log('Intentando login con usuario:', username);
        
        const loginData = {
            username: username,
            password: password
        };
        
        console.log('Datos de login:', { username: username, password: '****' });
        
        const response = await fetch(`${API_URL}auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginData),
            credentials: 'include',
            mode: 'cors'
        });

        console.log('Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('Datos recibidos:', data);

        if (!response.ok) {
            const errorMessage = data.error || data.detail || 'Error al iniciar sesión';
            console.error('Error de autenticación:', errorMessage);
            throw new Error(errorMessage);
        }

        // Verificar que tenemos un token dentro del objeto user
        if (!data.user || !data.user.token) {
            console.error('No se recibió token en la respuesta:', data);
            throw new Error('No se recibió token de autenticación');
        }

        // Guardar información del usuario y token
        const userData = {
            username: data.user.username,
            token: data.user.token,
            is_staff: data.user.is_staff
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('Login exitoso, token guardado:', userData);
        
        // Esperar un momento para asegurar que el token se guarde
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar que el token se guardó correctamente
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (!savedUser || !savedUser.token) {
            throw new Error('Error al guardar la sesión');
        }
        
        // Redirigir a la página de pedidos
        window.location.href = 'orders.html';
    } catch (error) {
        console.error('Error en login:', error);
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
        throw error;
    }
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
    console.log('Verificando autenticación...');
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('Datos de usuario:', user);
    
    if (!user || !user.token) {
        console.log('No hay usuario autenticado o token inválido');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar que el token no esté expirado
    const token = user.token;
    if (!token || token.length < 10) {  // Un token válido debería tener al menos 10 caracteres
        console.log('Token inválido o expirado');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('Usuario autenticado correctamente');
    return true;
}

async function logout() {
    try {
        // Obtener el token de la sesión
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.token) {
            console.error('No hay usuario en sesión o token no encontrado');
            window.location.href = 'login.html';
            return;
        }

        await fetchWithTimeout(`${API_URL}auth/logout/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            }
        });

        // Limpiar información del usuario
        localStorage.removeItem('user');
        
        // Redirigir a la página de login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error en logout:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

// Funciones de gestión de pedidos
async function loadOrders(status = 'all', client = '', phone = '', address = '') {
    try {
        console.log('Iniciando carga de pedidos...');
        
        // Verificar autenticación
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.token) {
            console.error('No hay usuario autenticado');
            window.location.href = 'login.html';
            return;
        }

        // Construir la URL base
        const baseUrl = `${API_URL}pedidos/`;
        console.log('URL base:', baseUrl);

        // Construir la URL con los parámetros
        const url = new URL(baseUrl);
        if (status !== 'all') url.searchParams.append('status', status);
        if (client) url.searchParams.append('client', client);
        if (phone) url.searchParams.append('phone', phone);
        if (address) url.searchParams.append('address', address);

        console.log('URL final de la petición:', url.toString());
        console.log('Token de autenticación:', user.token);

        // Realizar la petición
        const response = await fetchWithTimeout(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.token}`
            }
        });

        console.log('Respuesta del servidor:', {
            status: response.status,
            data: response.data
        });
        
        if (!response.data) {
            console.error('No se recibieron datos en la respuesta');
            showNotification('No se pudieron cargar los pedidos', 'error');
            return;
        }

        console.log('Mostrando pedidos:', response.data);
        displayOrders(response.data);
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        if (error.message.includes('autenticación') || error.message.includes('no autorizado')) {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } else {
            showNotification(error.message, 'error');
        }
    }
}

function displayOrders(orders) {
    console.log('Iniciando displayOrders con:', JSON.stringify(orders, null, 2));
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) {
        console.error('No se encontró el elemento orders-list');
        return;
    }

    ordersList.innerHTML = '';

    if (!Array.isArray(orders) || orders.length === 0) {
        console.log('No hay pedidos para mostrar');
        ordersList.innerHTML = `
            <tr>
                <td colspan="7" class="no-orders">
                    No hay pedidos para mostrar
                </td>
            </tr>
        `;
        return;
    }

    orders.forEach((order, index) => {
        console.log(`Procesando pedido ${index + 1}:`, JSON.stringify(order, null, 2));
        
        // Obtener la información del cliente
        let clienteNombre, clienteTelefono, clienteDireccion;

        if (order.cliente && typeof order.cliente === 'object') {
            // Si cliente es un objeto con propiedades
            clienteNombre = order.cliente.nombre || 'Cliente no especificado';
            clienteTelefono = order.cliente.telefono || 'No especificado';
            clienteDireccion = order.cliente.direccion || 'No especificada';
        } else {
            // Si cliente es un string o no existe
            clienteNombre = order.cliente || 'Cliente no especificado';
            clienteTelefono = order.telefono || 'No especificado';
            clienteDireccion = order.direccion || 'No especificada';
        }

        console.log('Información del cliente extraída:', {
            nombre: clienteNombre,
            telefono: clienteTelefono,
            direccion: clienteDireccion
        });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${new Date(order.fecha).toLocaleString()}</td>
            <td>
                <div class="client-info">
                    <strong>${clienteNombre}</strong>
                    <div class="client-details">
                        <small>📞 ${clienteTelefono}</small>
                        <small>📍 ${clienteDireccion}</small>
                    </div>
                </div>
            </td>
            <td>$${parseFloat(order.total).toFixed(2)}</td>
            <td>
                <span class="status-badge status-${order.estado}">
                    ${order.estado}
                </span>
            </td>
            <td>
                <button class="action-btn view-btn" onclick="showOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
                ${order.estado === 'pendiente' ? `
                    <button class="action-btn mark-btn" onclick="updateOrderStatus(${order.id}, 'atendido')">
                        <i class="fas fa-check"></i> Marcar atendido
                    </button>
                ` : ''}
            </td>
        `;
        ordersList.appendChild(row);
    });
}

// Función de utilidad para obtener el token CSRF
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        // Obtener el token de la sesión
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.token) {
            console.error('No hay usuario en sesión o token no encontrado');
            window.location.href = 'login.html';
            return;
        }

        console.log('Enviando actualización de estado:', {
            orderId,
            newStatus,
            token: user.token
        });

        const response = await fetchWithTimeout(`${API_URL}pedidos/${orderId}/status/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({ estado: newStatus })
        });

        console.log('Respuesta del servidor:', response);

        // Verificar si la respuesta es un error
        if (!response || response.status === 403) {
            console.error('Error de autenticación al actualizar estado');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        if (response.error) {
            throw new Error(response.error);
        }

        showNotification('Estado actualizado exitosamente', 'success');
        
        // Recargar la lista de pedidos con el filtro actual
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const searchClient = document.getElementById('search-client')?.value || '';
        const searchPhone = document.getElementById('search-phone')?.value || '';
        const searchAddress = document.getElementById('search-address')?.value || '';
        
        await loadOrders(statusFilter, searchClient, searchPhone, searchAddress);
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        if (error.message.includes('autenticación') || error.message.includes('no autorizado')) {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } else {
            showNotification(error.message || 'Error al actualizar el estado del pedido', 'error');
        }
    }
}

function showOrderDetails(orderId) {
    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-content');
    
    // Mostrar mensaje de carga
    content.innerHTML = `<p>Cargando detalles del pedido #${orderId}...</p>`;
    modal.style.display = 'block';
    
    // Obtener el token de la sesión
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Obtener los detalles del pedido
    fetchWithTimeout(`${API_URL}pedidos/${orderId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${user.token}`
        }
    })
    .then(data => {
        if (!data) {
            throw new Error('No se recibieron datos del servidor');
        }
        
        // Formatear la fecha
        const fecha = new Date(data.fecha).toLocaleString();
        
        // Obtener la información del cliente
        const clienteNombre = data.cliente?.nombre || data.cliente || 'Cliente no especificado';
        const clienteTelefono = data.cliente?.telefono || data.telefono || 'No especificado';
        const clienteDireccion = data.cliente?.direccion || data.direccion || 'No especificada';
        
        // Crear el HTML para mostrar los detalles
        let detallesHtml = `
            <div class="order-details">
                <h2>Detalles del Pedido #${data.id}</h2>
                <div class="order-info">
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Cliente:</strong> ${clienteNombre}</p>
                    <p><strong>Teléfono:</strong> ${clienteTelefono}</p>
                    <p><strong>Dirección:</strong> ${clienteDireccion}</p>
                    <p><strong>Estado:</strong> <span class="status-badge status-${data.estado}">${data.estado}</span></p>
                </div>
                <div class="order-items">
                    <h3>Items del Pedido</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Plato</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Agregar cada item del pedido
        data.detalles.forEach(detalle => {
            detallesHtml += `
                <tr>
                    <td>${detalle.plato.nombre}</td>
                    <td>${detalle.cantidad}</td>
                    <td>$${detalle.plato.precio.toFixed(2)}</td>
                    <td>$${detalle.subtotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Cerrar la tabla y agregar el total
        detallesHtml += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="total-label">Total:</td>
                                <td class="total-value">$${data.total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        content.innerHTML = detallesHtml;
    })
    .catch(error => {
        console.error('Error al cargar detalles del pedido:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${error.message}</p>
            </div>
        `;
    });
}

// Event listeners para la página de pedidos
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de pedidos
    if (window.location.pathname.includes('orders.html')) {
        console.log('Inicializando página de pedidos');
        
        // Verificar autenticación
        if (!checkAuth()) {
            console.log('Redirigiendo a login por falta de autenticación');
            return;
        }

        // Mostrar nombre de usuario
        const user = JSON.parse(localStorage.getItem('user'));
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.username;
        }

        // Event listener para el botón de logout
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await logout();
                window.location.href = 'login.html';
            });
        }

        // Event listeners para los filtros
        const statusFilter = document.getElementById('status-filter');
        const searchClient = document.getElementById('search-client');
        const searchPhone = document.getElementById('search-phone');
        const searchAddress = document.getElementById('search-address');

        const applyFilters = () => {
            console.log('Aplicando filtros:', {
                status: statusFilter?.value,
                client: searchClient?.value,
                phone: searchPhone?.value,
                address: searchAddress?.value
            });
            
            loadOrders(
                statusFilter?.value || 'all',
                searchClient?.value || '',
                searchPhone?.value || '',
                searchAddress?.value || ''
            );
        };

        if (statusFilter) {
            statusFilter.addEventListener('change', applyFilters);
        }

        if (searchClient) {
            searchClient.addEventListener('input', debounce(applyFilters, 500));
        }

        if (searchPhone) {
            searchPhone.addEventListener('input', debounce(applyFilters, 500));
        }

        if (searchAddress) {
            searchAddress.addEventListener('input', debounce(applyFilters, 500));
        }

        // Cargar pedidos inicialmente
        console.log('Iniciando carga de pedidos...');
        loadOrders();
    }

    // Event listener para cerrar el modal
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = document.getElementById('order-details-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Función de utilidad para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}