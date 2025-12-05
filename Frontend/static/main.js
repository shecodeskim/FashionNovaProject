// Global Configuration
const API_BASE_URL = 'http://localhost:8000/api';
const SITE_URL = 'http://localhost:8000';

// Global State
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let cartCount = 0;
let wishlistCount = 0;

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    return re.test(phone);
}

function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('id', toastId);
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

function showLoading() {
    let loadingEl = document.getElementById('loadingOverlay');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingOverlay';
        loadingEl.className = 'loading-overlay';
        loadingEl.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(loadingEl);
    }
    loadingEl.style.display = 'flex';
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

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

// API Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        showToast('Network error. Please try again.', 'danger');
        return null;
    }
}

async function apiRequestWithFile(endpoint, formData) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        showToast('Network error. Please try again.', 'danger');
        return null;
    }
}

// Auth Functions
async function login(email, password) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        
        const data = await response.json();
        
        setAuthToken(data.token);
        setCurrentUser(data.user);
        
        showToast('Login successful!');
        return data;
    } catch (error) {
        showToast(error.message, 'danger');
        return null;
    } finally {
        hideLoading();
    }
}

async function register(userData) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            const errorMessage = Object.values(error).flat().join(', ');
            throw new Error(errorMessage || 'Registration failed');
        }
        
        const data = await response.json();
        
        setAuthToken(data.token);
        setCurrentUser(data.user);
        
        showToast('Registration successful!');
        return data;
    } catch (error) {
        showToast(error.message, 'danger');
        return null;
    } finally {
        hideLoading();
    }
}

function setAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
}

function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function handleUnauthorized() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/register')) {
        window.location.href = '/login/';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    showToast('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

function isLoggedIn() {
    return !!authToken;
}

function getUserType() {
    return currentUser?.user_type;
}

// Product Functions
async function getProducts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiRequest(`/products/?${params}`);
}

async function getProduct(id) {
    return await apiRequest(`/products/${id}/`);
}

async function getCategories() {
    return await apiRequest('/categories/');
}

async function getBrands() {
    return await apiRequest('/brands/');
}

async function getFeaturedProducts(limit = 8) {
    return await apiRequest(`/products/?is_featured=true&limit=${limit}`);
}

async function getDiscountProducts(limit = 8) {
    return await apiRequest(`/products/?has_discount=true&limit=${limit}`);
}

async function searchProducts(query) {
    return await apiRequest(`/products/?search=${encodeURIComponent(query)}`);
}

// Wishlist Functions
async function getWishlist() {
    if (!authToken) return [];
    return await apiRequest('/wishlist/');
}

async function addToWishlist(productId) {
    if (!authToken) {
        window.location.href = '/login/';
        return null;
    }
    
    return await apiRequest('/wishlist/', {
        method: 'POST',
        body: JSON.stringify({ product: productId })
    });
}

async function removeFromWishlist(wishlistItemId) {
    return await apiRequest(`/wishlist/${wishlistItemId}/`, {
        method: 'DELETE'
    });
}

async function toggleWishlist(productId) {
    if (!authToken) {
        window.location.href = '/login/';
        return;
    }
    
    try {
        const wishlist = await getWishlist();
        const existingItem = wishlist?.find(item => item.product === productId);
        
        if (existingItem) {
            await removeFromWishlist(existingItem.id);
            showToast('Removed from wishlist');
            return false;
        } else {
            await addToWishlist(productId);
            showToast('Added to wishlist');
            return true;
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        showToast('Error updating wishlist', 'danger');
        return null;
    }
}

async function moveToCart(wishlistItemId) {
    return await apiRequest('/wishlist/move_to_cart/', {
        method: 'POST',
        body: JSON.stringify({ wishlist_item_id: wishlistItemId })
    });
}

// Cart Functions
async function getCart() {
    if (!authToken) return null;
    return await apiRequest('/cart/my_cart/');
}

async function addToCart(productId, quantity = 1) {
    if (!authToken) {
        window.location.href = '/login/';
        return null;
    }
    
    return await apiRequest('/cart/add_item/', {
        method: 'POST',
        body: JSON.stringify({ product: productId, quantity })
    });
}

async function removeFromCart(itemId) {
    return await apiRequest('/cart/remove_item/', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId })
    });
}

async function updateCartQuantity(itemId, quantity) {
    return await apiRequest('/cart/update_quantity/', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId, quantity })
    });
}

async function clearCart() {
    const cart = await getCart();
    if (!cart) return;
    
    for (const item of cart.items) {
        await removeFromCart(item.id);
    }
}

// Order Functions
async function createOrder(orderData) {
    return await apiRequest('/orders/', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

async function getOrders() {
    if (!authToken) return [];
    return await apiRequest('/orders/');
}

async function getOrder(id) {
    return await apiRequest(`/orders/${id}/`);
}

async function cancelOrder(orderId) {
    return await apiRequest(`/orders/${orderId}/cancel/`, {
        method: 'POST'
    });
}

async function getOrderStatus(orderId) {
    return await apiRequest(`/orders/${orderId}/status/`);
}

// Review Functions
async function getProductReviews(productId) {
    return await apiRequest(`/products/${productId}/reviews/`);
}

async function addReview(productId, rating, review) {
    return await apiRequest('/reviews/', {
        method: 'POST',
        body: JSON.stringify({
            product: productId,
            rating,
            review
        })
    });
}

async function updateReview(reviewId, rating, review) {
    return await apiRequest(`/reviews/${reviewId}/`, {
        method: 'PUT',
        body: JSON.stringify({ rating, review })
    });
}

async function deleteReview(reviewId) {
    return await apiRequest(`/reviews/${reviewId}/`, {
        method: 'DELETE'
    });
}

// Coupon Functions
async function validateCoupon(code, cartTotal) {
    return await apiRequest('/coupons/validate/', {
        method: 'POST',
        body: JSON.stringify({ code, cart_total: cartTotal })
    });
}

// Payment Functions
async function initiateMpesaPayment(orderId, phoneNumber, amount) {
    return await apiRequest('/payments/stk-push/', {
        method: 'POST',
        body: JSON.stringify({
            order_id: orderId,
            phone_number: phoneNumber,
            amount: amount
        })
    });
}

async function checkPaymentStatus(checkoutRequestId) {
    return await apiRequest(`/payments/status/${checkoutRequestId}/`);
}

// User Profile Functions
async function getProfile() {
    return await apiRequest('/auth/profile/');
}

async function updateProfile(profileData) {
    return await apiRequest('/auth/profile/', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

async function updateProfileImage(imageFile) {
    const formData = new FormData();
    formData.append('profile_picture', imageFile);
    
    return await apiRequestWithFile('/auth/profile/image/', formData);
}

async function changePassword(currentPassword, newPassword) {
    return await apiRequest('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });
}

// Seller Functions
async function getSellerStats() {
    return await apiRequest('/seller/stats/');
}

async function getSellerProducts(page = 1, limit = 10) {
    return await apiRequest(`/seller/products/?page=${page}&limit=${limit}`);
}

async function createSellerProduct(productData) {
    return await apiRequest('/seller/products/', {
        method: 'POST',
        body: JSON.stringify(productData)
    });
}

async function updateSellerProduct(productId, productData) {
    return await apiRequest(`/seller/products/${productId}/`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    });
}

async function deleteSellerProduct(productId) {
    return await apiRequest(`/seller/products/${productId}/`, {
        method: 'DELETE'
    });
}

async function getSellerOrders(page = 1, limit = 10) {
    return await apiRequest(`/seller/orders/?page=${page}&limit=${limit}`);
}

async function updateOrderStatus(orderId, status) {
    return await apiRequest(`/seller/orders/${orderId}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status })
    });
}

// UI Update Functions
async function updateHeaderCounts() {
    if (!authToken) {
        cartCount = 0;
        wishlistCount = 0;
        return;
    }
    
    try {
        const [cart, wishlist] = await Promise.all([
            getCart(),
            getWishlist()
        ]);
        
        cartCount = cart?.items?.length || 0;
        wishlistCount = wishlist?.length || 0;
        
        updateCartCount(cartCount);
        updateWishlistCount(wishlistCount);
    } catch (error) {
        console.error('Error updating header counts:', error);
    }
}

function updateCartCount(count) {
    const cartElements = document.querySelectorAll('#cartCount, .cart-count');
    cartElements.forEach(el => {
        if (count > 0) {
            el.textContent = count;
            el.style.display = 'inline-block';
        } else {
            el.style.display = 'none';
        }
    });
}

function updateWishlistCount(count) {
    const wishlistElements = document.querySelectorAll('#wishlistCount, .wishlist-count');
    wishlistElements.forEach(el => {
        if (count > 0) {
            el.textContent = count;
            el.style.display = 'inline-block';
        } else {
            el.style.display = 'none';
        }
    });
}

function updateUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (!userDropdown) return;
    
    if (authToken && currentUser) {
        const userName = currentUser.first_name || currentUser.username || 'User';
        userDropdown.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user-circle"></i>
                <span class="d-none d-md-inline ms-1">${userName}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="/profile/"><i class="fas fa-user me-2"></i>Profile</a></li>
                <li><a class="dropdown-item" href="/orders/"><i class="fas fa-box me-2"></i>My Orders</a></li>
                ${currentUser.user_type === 'seller' ? 
                    '<li><a class="dropdown-item" href="/seller/dashboard/"><i class="fas fa-store me-2"></i>Seller Dashboard</a></li>' : ''}
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
            </ul>
        `;
        
        // Add logout event listener
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    } else {
        userDropdown.innerHTML = `
            <a class="nav-link" href="/login/">
                <i class="fas fa-sign-in-alt me-1"></i>Login
            </a>
        `;
    }
}

async function loadCategoriesDropdown() {
    const categoriesMenu = document.getElementById('categoriesMenu');
    if (!categoriesMenu) return;
    
    try {
        const categories = await getCategories();
        if (categories && categories.length > 0) {
            categoriesMenu.innerHTML = '';
            
            categories.slice(0, 8).forEach(category => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a class="dropdown-item" href="/category/${category.id}/">
                        ${category.name}
                    </a>
                `;
                categoriesMenu.appendChild(li);
            });
            
            // Add "View All" option if there are more categories
            if (categories.length > 8) {
                const li = document.createElement('li');
                li.innerHTML = '<hr class="dropdown-divider">';
                categoriesMenu.appendChild(li);
                
                const viewAllLi = document.createElement('li');
                viewAllLi.innerHTML = `
                    <a class="dropdown-item text-primary" href="/categories/">
                        <i class="fas fa-arrow-right me-1"></i> View All Categories
                    </a>
                `;
                categoriesMenu.appendChild(viewAllLi);
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Product Display Functions
function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    
    return stars;
}

function createProductCard(product) {
    const mainImage = product.images?.[0]?.image || '/static/images/default-product.jpg';
    const discountedPrice = product.discount_price || product.price;
    const discountPercentage = product.discount_percentage || 0;
    const rating = product.average_rating || 0;
    
    return `
        <div class="col-md-3 col-sm-6 mb-4">
            <div class="card h-100 product-card">
                <div class="position-relative">
                    <img src="${mainImage}" 
                         class="card-img-top product-image" 
                         alt="${product.name}"
                         onclick="window.location.href='/product/${product.id}/'">
                    
                    ${discountPercentage > 0 ? 
                        `<span class="badge bg-danger position-absolute top-0 end-0 m-2">
                            -${discountPercentage}%
                        </span>` : ''
                    }
                    
                    <button class="btn btn-sm btn-outline-secondary position-absolute top-0 start-0 m-2 wishlist-btn"
                            onclick="event.stopPropagation(); toggleProductWishlist(${product.id}, this)">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                
                <div class="card-body">
                    <h6 class="card-title product-name" 
                        onclick="window.location.href='/product/${product.id}/'"
                        style="cursor: pointer;">
                        ${product.name}
                    </h6>
                    
                    <p class="card-text text-muted small product-description">
                        ${product.description.substring(0, 60)}...
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-danger fw-bold product-price">
                                ${formatCurrency(discountedPrice)}
                            </span>
                            ${product.discount_price ? 
                                `<span class="text-muted text-decoration-line-through small ms-2">
                                    ${formatCurrency(product.price)}
                                </span>` : ''
                            }
                        </div>
                        
                        <div class="rating">
                            ${generateStarRating(rating)}
                            <small class="text-muted ms-1">(${rating.toFixed(1)})</small>
                        </div>
                    </div>
                </div>
                
                <div class="card-footer bg-transparent border-top-0">
                    <button class="btn btn-primary w-100 add-to-cart-btn"
                            onclick="event.stopPropagation(); addProductToCart(${product.id})">
                        <i class="fas fa-shopping-cart me-2"></i>Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Event Handlers
async function toggleProductWishlist(productId, button) {
    const icon = button.querySelector('i');
    const isAdded = await toggleWishlist(productId);
    
    if (isAdded !== null) {
        if (isAdded) {
            icon.className = 'fas fa-heart text-danger';
        } else {
            icon.className = 'far fa-heart';
        }
        await updateHeaderCounts();
    }
}

async function addProductToCart(productId) {
    const result = await addToCart(productId);
    if (result) {
        showToast('Added to cart successfully');
        await updateHeaderCounts();
    }
}

// Search Functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    const performSearch = debounce(async (query) => {
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('show');
            return;
        }
        
        try {
            const products = await searchProducts(query);
            
            if (products && products.length > 0) {
                searchResults.innerHTML = products.slice(0, 5).map(product => `
                    <a href="/product/${product.id}/" class="dropdown-item">
                        <div class="d-flex align-items-center">
                            <img src="${product.images?.[0]?.image || ''}" 
                                 alt="${product.name}" 
                                 class="search-thumbnail me-3">
                            <div>
                                <div class="fw-medium">${product.name}</div>
                                <small class="text-muted">${formatCurrency(product.discounted_price || product.price)}</small>
                            </div>
                        </div>
                    </a>
                `).join('');
                
                searchResults.classList.add('show');
            } else {
                searchResults.innerHTML = '<div class="dropdown-item text-muted">No products found</div>';
                searchResults.classList.add('show');
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
}

// Initialize Application
function initApp() {
    // Update UI based on auth state
    updateUserDropdown();
    updateHeaderCounts();
    
    // Load categories dropdown
    loadCategoriesDropdown();
    
    // Initialize search
    initSearch();
    
    // Add global event listeners
    document.addEventListener('click', (e) => {
        // Handle logout button if dynamically added
        if (e.target.closest('#logoutBtn')) {
            e.preventDefault();
            logout();
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for use in other modules
window.FashionNova = {
    API_BASE_URL,
    authToken,
    currentUser,
    login,
    register,
    logout,
    getProducts,
    getProduct,
    addToCart,
    toggleWishlist,
    createProductCard,
    formatCurrency,
    formatDate,
    showToast,
    isLoggedIn,
    getUserType
};