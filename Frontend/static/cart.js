// Shopping Cart JavaScript
let cart = null;
let appliedCoupon = null;
let isLoading = false;

// DOM Elements
let cartItemsContainer, emptyCartMessage, checkoutBtn;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    cartItemsContainer = document.getElementById('cartItems');
    emptyCartMessage = document.getElementById('emptyCart');
    checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartItemsContainer) return;
    
    // Check authentication
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    // Load cart
    loadCart();
    
    // Setup event listeners
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Apply coupon button
    document.getElementById('applyCoupon')?.addEventListener('click', applyCoupon);
    
    // Coupon input enter key
    document.getElementById('couponCode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyCoupon();
        }
    });
    
    // Checkout button
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
    }
    
    // Continue shopping button
    document.getElementById('continueShopping')?.addEventListener('click', function() {
        window.location.href = '/products/';
    });
    
    // Clear cart button
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
}

// Load Cart
async function loadCart() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        cart = await FashionNova.getCart();
        
        if (cart) {
            displayCartItems();
            updateOrderSummary();
        } else {
            showEmptyCart();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        FashionNova.showToast('Error loading cart', 'danger');
        showEmptyCart();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Display Cart Items
function displayCartItems() {
    if (!cart || !cart.items || cart.items.length === 0) {
        showEmptyCart();
        return;
    }
    
    if (emptyCartMessage) {
        emptyCartMessage.style.display = 'none';
    }
    
    cartItemsContainer.innerHTML = cart.items.map(item => createCartItemHTML(item)).join('');
    
    // Update checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
    }
    
    // Add event listeners to quantity controls
    addQuantityEventListeners();
}

// Create Cart Item HTML
function createCartItemHTML(item) {
    const product = item.product_details;
    const discountedPrice = product.discount_price || product.price;
    const totalPrice = discountedPrice * item.quantity;
    const originalTotal = product.discount_price ? product.price * item.quantity : null;
    
    return `
        <div class="cart-item row align-items-center" data-item-id="${item.id}">
            <div class="col-md-2 col-4">
                <img src="${product.images?.[0]?.image || '/static/images/default-product.jpg'}" 
                     class="img-fluid rounded" 
                     alt="${product.name}"
                     onclick="window.location.href='/product/${product.id}/'"
                     style="cursor: pointer;">
            </div>
            
            <div class="col-md-4 col-8">
                <h6 class="mb-1">
                    <a href="/product/${product.id}/" class="text-decoration-none text-dark">
                        ${product.name}
                    </a>
                </h6>
                <p class="text-muted small mb-2">
                    ${product.seller_name || 'Seller'}
                </p>
                
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary quantity-btn" 
                            onclick="updateQuantity(${item.id}, ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>
                    
                    <input type="number" 
                           class="form-control form-control-sm quantity-input mx-2" 
                           value="${item.quantity}" 
                           min="1" 
                           max="${product.stock_quantity}"
                           data-item-id="${item.id}"
                           style="width: 70px;">
                    
                    <button class="btn btn-sm btn-outline-secondary quantity-btn" 
                            onclick="updateQuantity(${item.id}, ${item.quantity + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            
            <div class="col-md-3 col-6 text-md-center text-start mt-3 mt-md-0">
                <div class="h6 mb-1">
                    ${FashionNova.formatCurrency(totalPrice)}
                </div>
                
                ${originalTotal ? `
                    <small class="text-muted text-decoration-line-through">
                        ${FashionNova.formatCurrency(originalTotal)}
                    </small>
                ` : ''}
                
                <div class="text-muted small">
                    ${FashionNova.formatCurrency(discountedPrice)} each
                </div>
            </div>
            
            <div class="col-md-3 col-6 text-md-center text-end mt-3 mt-md-0">
                <button class="btn btn-outline-danger btn-sm" 
                        onclick="removeItem(${item.id})">
                    <i class="fas fa-trash me-1"></i>Remove
                </button>
                
                <button class="btn btn-outline-primary btn-sm ms-2" 
                        onclick="window.location.href='/product/${product.id}/'">
                    <i class="fas fa-eye me-1"></i>View
                </button>
            </div>
        </div>
    `;
}

// Add Quantity Event Listeners
function addQuantityEventListeners() {
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.dataset.itemId;
            const quantity = parseInt(this.value) || 1;
            updateQuantity(itemId, quantity);
        });
        
        input.addEventListener('blur', function() {
            const itemId = this.dataset.itemId;
            const quantity = parseInt(this.value) || 1;
            const maxStock = this.max || 100;
            
            if (quantity < 1) {
                this.value = 1;
                updateQuantity(itemId, 1);
            } else if (quantity > maxStock) {
                this.value = maxStock;
                updateQuantity(itemId, maxStock);
            }
        });
    });
}

// Update Quantity
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
        await removeItem(itemId);
        return;
    }
    
    const item = cart?.items?.find(i => i.id == itemId);
    if (!item) return;
    
    const maxStock = item.product_details.stock_quantity;
    if (newQuantity > maxStock) {
        FashionNova.showToast(`Only ${maxStock} items available in stock`, 'warning');
        newQuantity = maxStock;
    }
    
    try {
        await FashionNova.updateCartQuantity(itemId, newQuantity);
        
        // Update local cart state
        if (cart && cart.items) {
            const itemIndex = cart.items.findIndex(i => i.id == itemId);
            if (itemIndex !== -1) {
                cart.items[itemIndex].quantity = newQuantity;
            }
        }
        
        updateItemDisplay(itemId, newQuantity);
        updateOrderSummary();
        FashionNova.showToast('Cart updated');
        
    } catch (error) {
        console.error('Error updating quantity:', error);
        FashionNova.showToast('Error updating quantity', 'danger');
    }
}

// Update Item Display
function updateItemDisplay(itemId, quantity) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemElement) return;
    
    // Update quantity input
    const input = itemElement.querySelector('.quantity-input');
    if (input) {
        input.value = quantity;
    }
    
    // Update price
    const item = cart?.items?.find(i => i.id == itemId);
    if (item) {
        const product = item.product_details;
        const discountedPrice = product.discount_price || product.price;
        const totalPrice = discountedPrice * quantity;
        const originalTotal = product.discount_price ? product.price * quantity : null;
        
        const priceElement = itemElement.querySelector('.h6');
        if (priceElement) {
            priceElement.textContent = FashionNova.formatCurrency(totalPrice);
        }
        
        const originalPriceElement = itemElement.querySelector('.text-decoration-line-through');
        if (originalPriceElement && originalTotal) {
            originalPriceElement.textContent = FashionNova.formatCurrency(originalTotal);
        }
    }
}

// Remove Item
async function removeItem(itemId) {
    if (!confirm('Are you sure you want to remove this item from your cart?')) {
        return;
    }
    
    try {
        await FashionNova.removeFromCart(itemId);
        
        // Update local cart state
        if (cart && cart.items) {
            cart.items = cart.items.filter(i => i.id != itemId);
        }
        
        // Remove item from DOM
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.remove();
        }
        
        // Check if cart is now empty
        if (!cart || !cart.items || cart.items.length === 0) {
            showEmptyCart();
        } else {
            updateOrderSummary();
        }
        
        FashionNova.showToast('Item removed from cart');
        
    } catch (error) {
        console.error('Error removing item:', error);
        FashionNova.showToast('Error removing item', 'danger');
    }
}

// Clear Cart
async function clearCart() {
    if (!cart || !cart.items || cart.items.length === 0) {
        FashionNova.showToast('Cart is already empty', 'info');
        return;
    }
    
    if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
    }
    
    try {
        await FashionNova.clearCart();
        cart.items = [];
        showEmptyCart();
        FashionNova.showToast('Cart cleared successfully');
    } catch (error) {
        console.error('Error clearing cart:', error);
        FashionNova.showToast('Error clearing cart', 'danger');
    }
}

// Show Empty Cart
function showEmptyCart() {
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
    }
    
    if (emptyCartMessage) {
        emptyCartMessage.style.display = 'block';
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
    }
    
    // Update order summary
    updateOrderSummary();
}

// Update Order Summary
function updateOrderSummary() {
    if (!cart || !cart.items || cart.items.length === 0) {
        // Reset summary
        document.getElementById('subtotal').textContent = FashionNova.formatCurrency(0);
        document.getElementById('shipping').textContent = FashionNova.formatCurrency(0);
        document.getElementById('tax').textContent = FashionNova.formatCurrency(0);
        document.getElementById('discount').textContent = FashionNova.formatCurrency(0);
        document.getElementById('totalAmount').textContent = FashionNova.formatCurrency(0);
        return;
    }
    
    // Calculate totals
    const subtotal = cart.total_price || calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const discount = appliedCoupon?.discount || 0;
    const total = subtotal + shipping + tax - discount;
    
    // Update display
    document.getElementById('subtotal').textContent = FashionNova.formatCurrency(subtotal);
    document.getElementById('shipping').textContent = FashionNova.formatCurrency(shipping);
    document.getElementById('tax').textContent = FashionNova.formatCurrency(tax);
    document.getElementById('discount').textContent = `-${FashionNova.formatCurrency(discount)}`;
    document.getElementById('totalAmount').textContent = FashionNova.formatCurrency(total);
    
    // Update item count
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('itemCount')?.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
}

// Calculate Subtotal
function calculateSubtotal() {
    if (!cart || !cart.items) return 0;
    
    return cart.items.reduce((sum, item) => {
        const product = item.product_details;
        const price = product.discount_price || product.price;
        return sum + (price * item.quantity);
    }, 0);
}

// Calculate Shipping
function calculateShipping(subtotal) {
    // Free shipping for orders over 2000 KES
    return subtotal > 2000 ? 0 : 150;
}

// Calculate Tax
function calculateTax(subtotal) {
    // 16% VAT
    return subtotal * 0.16;
}

// Apply Coupon
async function applyCoupon() {
    const couponCode = document.getElementById('couponCode')?.value.trim();
    const messageDiv = document.getElementById('couponMessage');
    
    if (!couponCode) {
        if (messageDiv) {
            messageDiv.textContent = 'Please enter a coupon code';
            messageDiv.className = 'text-danger small';
        }
        return;
    }
    
    const subtotal = cart?.total_price || calculateSubtotal();
    
    try {
        const response = await FashionNova.validateCoupon(couponCode, subtotal);
        
        if (response && response.valid) {
            appliedCoupon = response;
            
            if (messageDiv) {
                messageDiv.textContent = 'Coupon applied successfully!';
                messageDiv.className = 'text-success small';
            }
            
            FashionNova.showToast('Coupon applied successfully');
            updateOrderSummary();
        } else {
            appliedCoupon = null;
            
            if (messageDiv) {
                messageDiv.textContent = response?.detail || 'Invalid coupon code';
                messageDiv.className = 'text-danger small';
            }
            
            updateOrderSummary();
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        
        if (messageDiv) {
            messageDiv.textContent = 'Error applying coupon';
            messageDiv.className = 'text-danger small';
        }
        
        FashionNova.showToast('Error applying coupon', 'danger');
    }
}

// Remove Coupon
function removeCoupon() {
    appliedCoupon = null;
    document.getElementById('couponCode').value = '';
    
    const messageDiv = document.getElementById('couponMessage');
    if (messageDiv) {
        messageDiv.textContent = '';
    }
    
    updateOrderSummary();
    FashionNova.showToast('Coupon removed');
}

// Proceed to Checkout
function proceedToCheckout() {
    if (!cart || !cart.items || cart.items.length === 0) {
        FashionNova.showToast('Your cart is empty', 'warning');
        return;
    }
    
    // Validate stock before checkout
    const outOfStockItems = cart.items.filter(item => {
        const product = item.product_details;
        return item.quantity > product.stock_quantity;
    });
    
    if (outOfStockItems.length > 0) {
        FashionNova.showToast('Some items in your cart are out of stock', 'warning');
        return;
    }
    
    // Redirect to checkout page
    window.location.href = '/checkout/';
}

// Move to Wishlist
async function moveToWishlist(itemId) {
    const item = cart?.items?.find(i => i.id == itemId);
    if (!item) return;
    
    try {
        // Add to wishlist
        const wishlistResult = await FashionNova.addToWishlist(item.product_details.id);
        
        if (wishlistResult) {
            // Remove from cart
            await removeItem(itemId);
            FashionNova.showToast('Item moved to wishlist');
        }
    } catch (error) {
        console.error('Error moving to wishlist:', error);
        FashionNova.showToast('Error moving to wishlist', 'danger');
    }
}

// Save Cart for Later
function saveForLater(itemId) {
    // This would typically involve moving the item to a "saved for later" list
    FashionNova.showToast('Feature coming soon!', 'info');
}

// Show Loading
function showLoading() {
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading cart...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when cart is displayed
}

// Export for global use
window.CartPage = {
    loadCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    proceedToCheckout
};