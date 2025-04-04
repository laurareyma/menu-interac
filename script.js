// Definición de variables globales
let cartItems = JSON.parse(localStorage.getItem("cart")) || [];
let totalAmount = 0;
const API_URL = 'https://script.google.com/macros/s/AKfycbzRy7MOaj9rZ-PBl4ZmqB0s7w6Mo3nLYcDS6ZMto_s6mb8n2Fd-BxiW1_Qa1DmqlWju/exec';
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

// Función para cargar el menú desde el servidor usando fetch
async function loadMenu() {
    try {
        // Mostrar indicador de carga
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        // Hacer la petición al servidor
        const response = await fetch(API_URL);
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        // Convertir la respuesta a JSON
        const menuData = await response.json();
        console.log("Productos cargados:", menuData);
        
        // Mostrar el menú en la página
        displayMenu(menuData);
    } catch (error) {
        console.error('Error al cargar el menú:', error);
        // Mostrar mensaje de error en la página
        document.querySelectorAll('.menu-items').forEach(container => {
            container.innerHTML = '<p class="error-message">No se pudo cargar el menú. Por favor, intenta más tarde.</p>';
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
    
    // Llenar cada categoría con sus productos
    menuData.data.forEach(item => {
        const category = categories[item.Categorias ? item.Categorias.toLowerCase() : item.category.toLowerCase()];
        if (category) {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            
            const imageUrl = item.imagen || item.image || 'https://via.placeholder.com/150';
            
            menuItem.innerHTML = `
                <img src="${imageUrl}" alt="${item.name || item.producto}">
                <h4>${item.name || item.producto}</h4>
                <p>${item.description || item.descripcion || ''}</p>
                <p class="price">$${(item.price || item.precio).toFixed(2)}</p>
                <div class="controls">
                    <button class="decrease control-btn">-</button>
                    <input type="text" value="1" readonly>
                    <button class="increase control-btn">+</button>
                </div>
                <button class="add-to-cart" data-id="${item.id || ''}">
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
                addToCart(item.id || item.producto, item.name || item.producto, item.price || item.precio, parseInt(quantityInput.value));
            });
            
            category.appendChild(menuItem);
        }
    });
}

// Función para agregar un producto al carrito
function addToCart(productId, productName, price, quantity = 1) {
    // Verificar si el producto ya está en el carrito
    const existingProductIndex = cartItems.findIndex(item => (item.id || item.producto) === productId);
    
    if (existingProductIndex !== -1) {
        // Si el producto ya está en el carrito, aumentar la cantidad
        cartItems[existingProductIndex].quantity += quantity;
    } else {
        // Si el producto no está en el carrito, agregarlo
        cartItems.push({
            id: productId,
            producto: productName,
            precio: price,
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
        cartContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío</p>';
        } else {
            cartItems.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.innerHTML = `
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name || item.producto}</span>
                        <div class="cart-item-price">$${(item.price || item.precio).toFixed(2)}</div>
                        <div class="cart-item-quantity">Cantidad: ${item.quantity}</div>
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
        productList.innerHTML = '';
        
        cartItems.forEach((item, index) => {
            const itemElement = document.createElement("div");
            itemElement.classList.add("product");
            itemElement.dataset.name = item.name || item.producto;
            itemElement.dataset.price = item.price || item.precio;

            itemElement.innerHTML = `
                <img src="${item.imagen || item.image || 'https://via.placeholder.com/150'}" alt="${item.name || item.producto}">
                <p>${item.name || item.producto}</p>
                <p>Precio Unitario: $${(item.price || item.precio).toLocaleString()}</p>
                <div class="controls">
                    <button class="decrease" data-index="${index}">-</button>
                    <input type="text" value="${item.quantity}" readonly>
                    <button class="increase" data-index="${index}">+</button>
                </div>
                <button class="remove" data-index="${index}">Eliminar</button>
            `;
            productList.appendChild(itemElement);
        });
    }
}

// Función para enviar el pedido al servidor
async function submitOrder(orderData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
            mode: 'no-cors'
        });
        
        // Con 'no-cors' no podrás leer la respuesta
        return { success: true, orderId: Date.now() };
    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        throw error;
    }
}

// Función para finalizar el pedido
async function checkout() {
    // Obtener datos del formulario
    const customerName = document.getElementById('customer-name')?.value || 
                        document.getElementById('address')?.value || '';
    const customerPhone = document.getElementById('customer-phone')?.value || 
                        document.getElementById('phone')?.value || '';
    const customerAddress = document.getElementById('customer-address')?.value || 
                            document.getElementById('apartment')?.value || '';
    
    // Validar que haya productos y datos de cliente
    if (cartItems.length === 0) {
        alert('Tu carrito está vacío. Agrega algunos productos antes de realizar el pedido.');
        return;
    }
    
    if (!customerName || !customerPhone || !customerAddress) {
        alert('Por favor completa todos los datos de envío.');
        return;
    }
    
    // Preparar el objeto de pedido
    const orderData = {
        nombre_cliente: customerName,
        telefono: customerPhone,
        direccion: customerAddress,
        productos: cartItems.map(item => ({
            id: item.id || item.producto,
            precio: item.price || item.precio,
            cantidad: item.quantity
        })),
        valor_total: totalAmount
    };

    try {
        // Enviar el pedido al servidor
        const result = await submitOrder(orderData);
        
        alert(`¡Gracias por tu pedido! Tu orden #${result.orderId} ha sido procesada.`);
        
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
        if (document.getElementById('checkout-modal')) {
            document.getElementById('checkout-modal').style.display = 'none';
        }
    } catch (error) {
        alert('Lo sentimos, hubo un problema al procesar tu pedido. Por favor, intenta de nuevo.');
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

// Actualizar resumen del pedido en el modal
function updateOrderSummary() {
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalElement = document.getElementById('order-total');
    
    if (orderItemsContainer && orderTotalElement) {
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
        
        orderTotalElement.textContent = `$${(totalAmount).toFixed(2)}`;
    }
}

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
    const checkoutBtn = document.getElementById('checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            const checkoutModal = document.getElementById('checkout-modal');
            if (checkoutModal) {
                checkoutModal.style.display = 'flex';
                updateOrderSummary();
            } else {
                checkout(); // Si no hay modal, hacer checkout directamente
            }
        });
    }
    
    // Event listener para cerrar el modal
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('checkout-modal').style.display = 'none';
        });
    }
    
    // Event listener para enviar el pedido desde el modal
    const submitOrderBtn = document.getElementById('submit-order');
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            checkout();
        });
    }
    
    // Event listener para el botón "Finalizar compra" en la página de carrito
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
});