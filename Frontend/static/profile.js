// Profile Page JavaScript
let userProfile = null;
let userOrders = [];
let userWishlist = [];
let currentTab = 'profile';

// DOM Elements
let profileContent;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    profileContent = document.getElementById('profileContent');
    
    // Check authentication
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    // Load profile data
    loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Profile form
    document.getElementById('profileForm')?.addEventListener('submit', saveProfile);
    
    // Password form
    document.getElementById('passwordForm')?.addEventListener('submit', changePassword);
    
    // Profile image upload
    document.getElementById('profileImageInput')?.addEventListener('change', uploadProfileImage);
    
    // Order actions
    document.getElementById('ordersContainer')?.addEventListener('click', handleOrderAction);
    
    // Wishlist actions
    document.getElementById('wishlistContainer')?.addEventListener('click', handleWishlistAction);
    
    // Address management
    document.getElementById('addAddressBtn')?.addEventListener('click', showAddAddressModal);
    document.getElementById('sameAsShipping')?.addEventListener('change', toggleBillingAddress);
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', FashionNova.logout);
}

// Load Profile Data
async function loadProfileData() {
    showLoading();
    
    try {
        // Load user profile
        userProfile = await FashionNova.getProfile();
        
        if (userProfile) {
            displayProfileInfo();
            
            // Load additional data based on current tab
            switch (currentTab) {
                case 'orders':
                    await loadOrders();
                    break;
                case 'wishlist':
                    await loadWishlist();
                    break;
                case 'addresses':
                    displayAddresses();
                    break;
                case 'settings':
                    displaySettings();
                    break;
            }
        }
        
    } catch (error) {
        console.error('Error loading profile data:', error);
        FashionNova.showToast('Error loading profile data', 'danger');
    } finally {
        hideLoading();
    }
}

// Display Profile Info
function displayProfileInfo() {
    if (!userProfile) return;
    
    // Update profile header
    document.getElementById('userName').textContent = 
        `${userProfile.first_name} ${userProfile.last_name}`;
    document.getElementById('userEmail').textContent = userProfile.email;
    document.getElementById('userType').textContent = 
        userProfile.user_type.charAt(0).toUpperCase() + userProfile.user_type.slice(1);
    
    // Update profile image
    const profileImage = document.getElementById('profileImage');
    if (profileImage && userProfile.profile_picture) {
        profileImage.src = userProfile.profile_picture;
    }
    
    // Populate profile form
    populateProfileForm();
}

// Populate Profile Form
function populateProfileForm() {
    if (!userProfile) return;
    
    document.getElementById('firstName').value = userProfile.first_name || '';
    document.getElementById('lastName').value = userProfile.last_name || '';
    document.getElementById('email').value = userProfile.email || '';
    document.getElementById('phone').value = userProfile.phone_number || '';
    document.getElementById('dateOfBirth').value = userProfile.date_of_birth || '';
    
    // Populate addresses if available
    if (userProfile.customer_profile) {
        document.getElementById('shippingAddress').value = 
            userProfile.customer_profile.shipping_address || '';
        document.getElementById('billingAddress').value = 
            userProfile.customer_profile.billing_address || '';
    }
}

// Switch Tab
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update active tab
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('show', 'active');
    
    // Load tab data
    switch (tabName) {
        case 'orders':
            loadOrders();
            break;
        case 'wishlist':
            loadWishlist();
            break;
        case 'addresses':
            displayAddresses();
            break;
        case 'settings':
            displaySettings();
            break;
    }
}

// Load Orders
async function loadOrders() {
    try {
        userOrders = await FashionNova.getOrders();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        FashionNova.showToast('Error loading orders', 'danger');
    }
}

// Display Orders
function displayOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;
    
    if (!userOrders || userOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                <h5>No orders yet</h5>
                <p class="text-muted">Start shopping to see your orders here</p>
                <a href="/products/" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userOrders.map(order => createOrderCard(order)).join('');
}

// Create Order Card
function createOrderCard(order) {
    const statusColors = {
        pending: 'warning',
        confirmed: 'info',
        processing: 'primary',
        shipped: 'success',
        delivered: 'success',
        cancelled: 'danger',
        refunded: 'secondary'
    };
    
    const statusText = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        refunded: 'Refunded'
    };
    
    return `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1">Order #${order.order_number}</h6>
                        <small class="text-muted">${FashionNova.formatDate(order.created_at)}</small>
                    </div>
                    <span class="badge bg-${statusColors[order.status]}">
                        ${statusText[order.status]}
                    </span>
                </div>
                
                <div class="row">
                    <div class="col-md-8">
                        <p class="mb-2">
                            <strong>Items:</strong> ${order.items_count || 0} item(s)
                        </p>
                        <p class="mb-0">
                            <strong>Total:</strong> ${FashionNova.formatCurrency(order.total_amount)}
                        </p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" 
                                    onclick="viewOrderDetails('${order.id}')">
                                <i class="fas fa-eye me-1"></i>View
                            </button>
                            ${order.status === 'pending' ? `
                                <button class="btn btn-outline-danger" 
                                        onclick="cancelOrder('${order.id}')">
                                    <i class="fas fa-times me-1"></i>Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load Wishlist
async function loadWishlist() {
    try {
        userWishlist = await FashionNova.getWishlist();
        displayWishlist();
    } catch (error) {
        console.error('Error loading wishlist:', error);
        FashionNova.showToast('Error loading wishlist', 'danger');
    }
}

// Display Wishlist
function displayWishlist() {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;
    
    if (!userWishlist || userWishlist.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-heart fa-3x text-muted mb-3"></i>
                <h5>Your wishlist is empty</h5>
                <p class="text-muted">Add items you love to your wishlist</p>
                <a href="/products/" class="btn btn-primary">Browse Products</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userWishlist.map(item => createWishlistItem(item)).join('');
}

// Create Wishlist Item
function createWishlistItem(item) {
    const product = item.product_details;
    const price = product.discount_price || product.price;
    const discount = product.discount_price ? 
        Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;
    
    return `
        <div class="card mb-3">
            <div class="row g-0">
                <div class="col-md-3">
                    <img src="${product.images?.[0]?.image || '/static/images/default-product.jpg'}" 
                         class="img-fluid rounded-start" 
                         alt="${product.name}"
                         style="height: 150px; object-fit: cover;">
                </div>
                <div class="col-md-9">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${product.name}</h6>
                                <p class="card-text text-muted small mb-2">
                                    ${product.seller_name || 'Seller'}
                                </p>
                                <div class="d-flex align-items-center">
                                    <span class="fw-medium text-danger me-2">
                                        ${FashionNova.formatCurrency(price)}
                                    </span>
                                    ${discount > 0 ? `
                                        <span class="text-muted text-decoration-line-through small me-2">
                                            ${FashionNova.formatCurrency(product.price)}
                                        </span>
                                        <span class="badge bg-danger">-${discount}%</span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" 
                                        onclick="addWishlistToCart('${item.id}')">
                                    <i class="fas fa-cart-plus me-1"></i>Add to Cart
                                </button>
                                <button class="btn btn-outline-danger" 
                                        onclick="removeFromWishlist('${item.id}')">
                                    <i class="fas fa-trash me-1"></i>Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Display Addresses
function displayAddresses() {
    const container = document.getElementById('addressesContainer');
    if (!container) return;
    
    if (!userProfile?.customer_profile) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
                <h5>No addresses saved</h5>
                <p class="text-muted">Add your shipping and billing addresses</p>
                <button class="btn btn-primary" onclick="showAddAddressModal()">
                    <i class="fas fa-plus me-1"></i>Add Address
                </button>
            </div>
        `;
        return;
    }
    
    const { shipping_address, billing_address } = userProfile.customer_profile;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-truck me-2"></i>Shipping Address
                        </h6>
                    </div>
                    <div class="card-body">
                        ${shipping_address ? `
                            <p class="card-text">${shipping_address.replace(/\n/g, '<br>')}</p>
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="editAddress('shipping')">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>
                        ` : `
                            <p class="text-muted">No shipping address saved</p>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="editAddress('shipping')">
                                <i class="fas fa-plus me-1"></i>Add Shipping Address
                            </button>
                        `}
                    </div>
                </div>
            </div>
            
            <div class="col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-file-invoice me-2"></i>Billing Address
                        </h6>
                    </div>
                    <div class="card-body">
                        ${billing_address ? `
                            <p class="card-text">${billing_address.replace(/\n/g, '<br>')}</p>
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="editAddress('billing')">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>
                        ` : `
                            <p class="text-muted">No billing address saved</p>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="editAddress('billing')">
                                <i class="fas fa-plus me-1"></i>Add Billing Address
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Display Settings
function displaySettings() {
    // Settings are already displayed in the template
    // This function can be used to load additional settings data
}

// Save Profile
async function saveProfile(e) {
    e.preventDefault();
    
    // Get form data
    const profileData = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone_number: document.getElementById('phone').value.trim(),
        date_of_birth: document.getElementById('dateOfBirth').value,
        shipping_address: document.getElementById('shippingAddress').value.trim(),
        billing_address: document.getElementById('billingAddress').value.trim()
    };
    
    // Validate form
    if (!validateProfileForm(profileData)) {
        return;
    }
    
    try {
        const updatedProfile = await FashionNova.updateProfile(profileData);
        
        if (updatedProfile) {
            userProfile = updatedProfile;
            FashionNova.showToast('Profile updated successfully', 'success');
            
            // Update UI
            displayProfileInfo();
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        FashionNova.showToast('Error updating profile', 'danger');
    }
}

// Validate Profile Form
function validateProfileForm(data) {
    clearValidationErrors();
    let isValid = true;
    
    // Validate first name
    if (!data.first_name) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    }
    
    // Validate last name
    if (!data.last_name) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    }
    
    // Validate email
    if (!data.email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!FashionNova.validateEmail(data.email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone
    if (!data.phone_number) {
        showFieldError('phone', 'Phone number is required');
        isValid = false;
    } else if (!FashionNova.validatePhone(data.phone_number)) {
        showFieldError('phone', 'Please enter a valid phone number');
        isValid = false;
    }
    
    return isValid;
}

// Change Password
async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate form
    if (!validatePasswordForm(currentPassword, newPassword, confirmPassword)) {
        return;
    }
    
    try {
        await FashionNova.changePassword(currentPassword, newPassword);
        
        FashionNova.showToast('Password changed successfully', 'success');
        e.target.reset();
        
    } catch (error) {
        console.error('Error changing password:', error);
        FashionNova.showToast('Error changing password', 'danger');
    }
}

// Validate Password Form
function validatePasswordForm(currentPassword, newPassword, confirmPassword) {
    clearValidationErrors('passwordForm');
    let isValid = true;
    
    // Validate current password
    if (!currentPassword) {
        showFieldError('currentPassword', 'Current password is required');
        isValid = false;
    }
    
    // Validate new password
    if (!newPassword) {
        showFieldError('newPassword', 'New password is required');
        isValid = false;
    } else if (newPassword.length < 8) {
        showFieldError('newPassword', 'Password must be at least 8 characters');
        isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        showFieldError('newPassword', 
            'Password must contain at least one uppercase letter, one lowercase letter, and one number');
        isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword) {
        showFieldError('confirmPassword', 'Please confirm your new password');
        isValid = false;
    } else if (newPassword !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    return isValid;
}

// Upload Profile Image
async function uploadProfileImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        FashionNova.showToast('Please select an image file', 'warning');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        FashionNova.showToast('Image size must be less than 5MB', 'warning');
        return;
    }
    
    try {
        const updatedProfile = await FashionNova.updateProfileImage(file);
        
        if (updatedProfile) {
            userProfile = updatedProfile;
            
            // Update profile image
            const profileImage = document.getElementById('profileImage');
            if (profileImage) {
                profileImage.src = updatedProfile.profile_picture;
            }
            
            FashionNova.showToast('Profile picture updated successfully', 'success');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        FashionNova.showToast('Error uploading profile image', 'danger');
    }
}

// Handle Order Action
function handleOrderAction(e) {
    const target = e.target;
    
    if (target.closest('.view-order-btn')) {
        const orderId = target.closest('.view-order-btn').dataset.orderId;
        viewOrderDetails(orderId);
    } else if (target.closest('.cancel-order-btn')) {
        const orderId = target.closest('.cancel-order-btn').dataset.orderId;
        cancelOrder(orderId);
    }
}

// View Order Details
function viewOrderDetails(orderId) {
    window.location.href = `/order/${orderId}/`;
}

// Cancel Order
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    try {
        await FashionNova.cancelOrder(orderId);
        
        FashionNova.showToast('Order cancelled successfully', 'success');
        
        // Reload orders
        await loadOrders();
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        FashionNova.showToast('Error cancelling order', 'danger');
    }
}

// Handle Wishlist Action
function handleWishlistAction(e) {
    const target = e.target;
    
    if (target.closest('.add-to-cart-btn')) {
        const wishlistItemId = target.closest('.add-to-cart-btn').dataset.itemId;
        addWishlistToCart(wishlistItemId);
    } else if (target.closest('.remove-wishlist-btn')) {
        const wishlistItemId = target.closest('.remove-wishlist-btn').dataset.itemId;
        removeFromWishlist(wishlistItemId);
    }
}

// Add Wishlist to Cart
async function addWishlistToCart(wishlistItemId) {
    try {
        await FashionNova.moveToCart(wishlistItemId);
        
        FashionNova.showToast('Item added to cart', 'success');
        
        // Reload wishlist
        await loadWishlist();
        
        // Update cart count
        await FashionNova.updateHeaderCounts();
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        FashionNova.showToast('Error adding to cart', 'danger');
    }
}

// Remove from Wishlist
async function removeFromWishlist(wishlistItemId) {
    if (!confirm('Remove this item from your wishlist?')) {
        return;
    }
    
    try {
        await FashionNova.removeFromWishlist(wishlistItemId);
        
        FashionNova.showToast('Removed from wishlist', 'success');
        
        // Reload wishlist
        await loadWishlist();
        
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        FashionNova.showToast('Error removing from wishlist', 'danger');
    }
}

// Show Add Address Modal
function showAddAddressModal() {
    const modalHTML = `
        <div class="modal fade" id="addressModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Address</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addressForm">
                            <div class="mb-3">
                                <label for="addressType" class="form-label">Address Type</label>
                                <select class="form-select" id="addressType">
                                    <option value="shipping">Shipping Address</option>
                                    <option value="billing">Billing Address</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="addressLine1" class="form-label">Address Line 1</label>
                                <input type="text" class="form-control" id="addressLine1" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="addressLine2" class="form-label">Address Line 2</label>
                                <input type="text" class="form-control" id="addressLine2">
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="city" class="form-label">City</label>
                                    <input type="text" class="form-control" id="city" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="postalCode" class="form-label">Postal Code</label>
                                    <input type="text" class="form-control" id="postalCode">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="country" class="form-label">Country</label>
                                <select class="form-select" id="country" required>
                                    <option value="Kenya" selected>Kenya</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveAddress()">Save Address</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('addressModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addressModal'));
    modal.show();
}

// Save Address
async function saveAddress() {
    const addressType = document.getElementById('addressType').value;
    const addressLine1 = document.getElementById('addressLine1').value.trim();
    const addressLine2 = document.getElementById('addressLine2').value.trim();
    const city = document.getElementById('city').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();
    const country = document.getElementById('country').value;
    
    // Validate form
    if (!addressLine1 || !city || !country) {
        FashionNova.showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Build address string
    const addressParts = [addressLine1];
    if (addressLine2) addressParts.push(addressLine2);
    addressParts.push(city);
    if (postalCode) addressParts.push(postalCode);
    addressParts.push(country);
    
    const fullAddress = addressParts.join(', ');
    
    try {
        const updateData = {};
        if (addressType === 'shipping') {
            updateData.shipping_address = fullAddress;
        } else {
            updateData.billing_address = fullAddress;
        }
        
        const updatedProfile = await FashionNova.updateProfile(updateData);
        
        if (updatedProfile) {
            userProfile = updatedProfile;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addressModal'));
            modal.hide();
            
            FashionNova.showToast('Address saved successfully', 'success');
            
            // Update addresses display
            if (currentTab === 'addresses') {
                displayAddresses();
            }
        }
    } catch (error) {
        console.error('Error saving address:', error);
        FashionNova.showToast('Error saving address', 'danger');
    }
}

// Edit Address
function editAddress(type) {
    showAddAddressModal();
    
    // Set address type
    setTimeout(() => {
        document.getElementById('addressType').value = type;
        
        // Pre-fill existing address if available
        if (userProfile?.customer_profile) {
            let address = '';
            if (type === 'shipping') {
                address = userProfile.customer_profile.shipping_address || '';
            } else {
                address = userProfile.customer_profile.billing_address || '';
            }
            
            if (address) {
                // Parse address (simple parsing for demonstration)
                const parts = address.split(', ');
                if (parts.length > 0) {
                    document.getElementById('addressLine1').value = parts[0] || '';
                }
                if (parts.length > 1) {
                    document.getElementById('city').value = parts[parts.length - 2] || '';
                }
            }
        }
    }, 500);
}

// Toggle Billing Address
function toggleBillingAddress() {
    const billingAddress = document.getElementById('billingAddress');
    const isChecked = document.getElementById('sameAsShipping').checked;
    
    if (isChecked) {
        billingAddress.value = document.getElementById('shippingAddress').value;
        billingAddress.disabled = true;
    } else {
        billingAddress.disabled = false;
    }
}

// Clear Validation Errors
function clearValidationErrors(formId = 'profileForm') {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    form.querySelectorAll('.invalid-feedback').forEach(error => {
        error.textContent = '';
    });
}

// Show Field Error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (field) {
        field.classList.add('is-invalid');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Show Loading
function showLoading() {
    if (profileContent) {
        profileContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading profile...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when content is displayed
}

// Export for global use
window.ProfilePage = {
    switchTab,
    loadOrders,
    loadWishlist,
    viewOrderDetails,
    cancelOrder,
    addWishlistToCart,
    removeFromWishlist,
    showAddAddressModal,
    editAddress,
    toggleBillingAddress
};