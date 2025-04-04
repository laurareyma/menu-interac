// Definición de variables globales
let cartItems = [];
let totalAmount = 0;
const API_URL = 'https://script.google.com/macros/s/AKfycbzRy7MOaj9rZ-PBl4ZmqB0s7w6Mo3nLYcDS6ZMto_s6mb8n2Fd-BxiW1_Qa1DmqlWju/exec';

// Objeto para representar el pedido
const order = {
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    products: [],
    totalAmount: 0
};

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

        // debugger;
        
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
        const category = categories[item.category.toLowerCase()];
        if (category) {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.description}</p>
                <p class="price">$${item.price.toFixed(2)}</p>
                <button class="add-to-cart" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">
                    Agregar al carrito
                </button>
            `;
            category.appendChild(menuItem);
        }
    });
}

// Función para agregar un producto al carrito
function addToCart(productId, productName, price) {
    // Verificar si el producto ya está en el carrito
    const existingProductIndex = cartItems.findIndex(item => item.id === productId);
    
    if (existingProductIndex !== -1) {
        // Si el producto ya está en el carrito, aumentar la cantidad
        cartItems[existingProductIndex].quantity += 1;
    } else {
        // Si el producto no está en el carrito, agregarlo
        cartItems.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1
        });
    }
    
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
    const productIndex = cartItems.findIndex(item => item.id === productId);
    
    if (productIndex !== -1) {
        // Si la cantidad es mayor a 1, disminuir la cantidad
        if (cartItems[productIndex].quantity > 1) {
            cartItems[productIndex].quantity -= 1;
        } else {
            // Si la cantidad es 1, eliminar el producto del carrito
            cartItems.splice(productIndex, 1);
        }
        
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
    totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Actualizar el total en la vista
    if (document.getElementById('cart-total')) {
        document.getElementById('cart-total').textContent = `$${totalAmount.toFixed(2)}`;
    }
}

// Función para mostrar los productos en el carrito
function displayCart() {
    const cartContainer = document.getElementById('cart-items');
    
    if (cartContainer) {
        cartContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío</p>';
        } else {
            cartItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.innerHTML = `
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        <div class="cart-item-quantity">Cantidad: ${item.quantity}</div>
                    </div>
                    <div class="cart-item-actions">
                        <button onclick="removeFromCart('${item.id}')">-</button>
                        <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})">+</button>
                    </div>
                `;
                cartContainer.appendChild(itemElement);
            });
        }
    }
}

// Función para enviar el pedido al servidor
async function submitOrder(orderData) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzRy7MOaj9rZ-PBl4ZmqB0s7w6Mo3nLYcDS6ZMto_s6mb8n2Fd-BxiW1_Qa1DmqlWju/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        throw error;
    }
}

// Función para finalizar el pedido
async function checkout() {
    // Obtener los datos del cliente
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    
    // Validar que se hayan ingresado todos los datos
    if (!customerName || !customerPhone || !customerAddress) {
        alert('Por favor ingresa todos tus datos para continuar.');
        return;
    }
    
    if (cartItems.length === 0) {
        alert('Tu carrito está vacío. Agrega productos para realizar un pedido.');
        return;
    }
    
    // Preparar el objeto de pedido
    order.customerName = customerName;
    order.customerPhone = customerPhone;
    order.customerAddress = customerAddress;
    order.products = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));
    order.totalAmount = totalAmount;
    
    try {
        // Enviar el pedido al servidor
        const result = await submitOrder(order);
        
        // Mostrar un mensaje de confirmación
        alert(`¡Gracias por tu pedido! Tu orden #${result.orderId} ha sido procesada.`);
        
        // Limpiar el carrito
        clearCart();
        
        // Cerrar el modal de checkout
        const checkoutModal = document.querySelector('.modal-overlay');
        if (checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    } catch (error) {
        alert('Lo sentimos, hubo un problema al procesar tu pedido. Por favor, intenta de nuevo.');
    }
}

// Función para limpiar el carrito
function clearCart() {
    cartItems = [];
    totalAmount = 0;
    updateCartCount();
    displayCart();
    updateCartTotal();
}

// Togglear la visibilidad del carrito
function toggleCart() {
    const cart = document.getElementById('shopping-cart');
    if (cart) {
        cart.classList.toggle('active');
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar el menú desde el servidor
    loadMenu();
    
    // Inicializar el carrito
    displayCart();
    
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
    
    // Event listener para el botón de checkout
    const checkoutBtn = document.getElementById('checkout');
    if (checkoutBtn) {
        // Mostrar el modal de checkout al hacer clic en el botón
        checkoutBtn.addEventListener('click', function() {
            // Verificar si el carrito tiene productos
            const checkoutModal = document.querySelector('.modal-overlay');
            if (checkoutModal) {
                checkoutModal.style.display = 'flex';
            }
            // Rellenar el formulario con los datos del cliente
            const submitOrderBtn = document.getElementById('submit-order');
            if (submitOrderBtn) {
                submitOrderBtn.addEventListener('click', function(e) {
                    e.preventDefault(); // Prevenir el comportamiento por defecto
                    checkout(); // Llamar a la función checkout
                });
            }
            // Cerrar el modal al hacer clic en el botón de cerrar
            const closeModalBtn = document.getElementById('close-modal');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', function() {
                    document.getElementById('checkout-modal').style.display = 'none';
                });
            }
            
        });
    }
    
    // Event listener para limpiar el carrito
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
});