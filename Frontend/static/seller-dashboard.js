// Seller Dashboard JavaScript
let sellerStats = null;
let sellerProducts = [];
let sellerOrders = [];
let currentProductPage = 1;
let currentOrderPage = 1;
let productsPerPage = 10;
let ordersPerPage = 10;

// DOM Elements
let dashboardContent;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    dashboardContent = document.getElementById('dashboardContent');
    
    // Check authentication and user type
    if (!FashionNova.authToken || !FashionNova.currentUser) {
        window.location.href = '/login/';
        return;
    }
    
    if (FashionNova.getUserType() !== 'seller') {
        window.location.href = '/';
        return;
    }
    
    // Load initial data
    loadDashboardData();
    
    // Setup event listeners
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });
    
    // Add product button
    document.getElementById('addProductBtn')?.addEventListener('click', showAddProductModal);
    
    // Modal close buttons
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', resetForms);
    });
    
    // Product form submission
    document.getElementById('productForm')?.addEventListener('submit', saveProduct);
    
    // Image upload
    document.getElementById('productImages')?.addEventListener('change', handleImageUpload);
    
    // Export buttons
    document.getElementById('exportProductsBtn')?.addEventListener('click', exportProducts);
    document.getElementById('exportOrdersBtn')?.addEventListener('click', exportOrders);
    
    // Date range filters
    document.getElementById('dateRangeFilter')?.addEventListener('change', filterByDateRange);
}

// Load Dashboard Data
async function loadDashboardData() {
    showLoading();
    
    try {
        // Load seller stats
        sellerStats = await getSellerStats();
        
        if (sellerStats) {
            displayDashboardStats();
        }
        
        // Load recent products
        await loadProducts(currentProductPage);
        
        // Load recent orders
        await loadOrders(currentOrderPage);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        FashionNova.showToast('Error loading dashboard data', 'danger');
    } finally {
        hideLoading();
    }
}

// Get Seller Stats
async function getSellerStats() {
    try {
        // In a real application, you would call an API endpoint
        // For now, we'll simulate with mock data
        return {
            total_revenue: 125000,
            total_orders: 45,
            total_products: 28,
            total_customers: 120,
            revenue_change: 12.5,
            orders_change: 8.2,
            products_change: 5.7,
            customers_change: 15.3,
            recent_orders: [],
            top_products: []
        };
    } catch (error) {
        console.error('Error getting seller stats:', error);
        return null;
    }
}

// Display Dashboard Stats
function displayDashboardStats() {
    if (!sellerStats) return;
    
    // Update stats cards
    document.getElementById('totalRevenue').textContent = 
        FashionNova.formatCurrency(sellerStats.total_revenue);
    document.getElementById('totalOrders').textContent = sellerStats.total_orders;
    document.getElementById('totalProducts').textContent = sellerStats.total_products;
    document.getElementById('totalCustomers').textContent = sellerStats.total_customers;
    
    // Update change indicators
    updateChangeIndicator('revenueChange', sellerStats.revenue_change);
    updateChangeIndicator('ordersChange', sellerStats.orders_change);
    updateChangeIndicator('productsChange', sellerStats.products_change);
    updateChangeIndicator('customersChange', sellerStats.customers_change);
}

// Update Change Indicator
function updateChangeIndicator(elementId, change) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isPositive = change >= 0;
    const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    const colorClass = isPositive ? 'text-success' : 'text-danger';
    
    element.innerHTML = `
        <i class="fas ${icon} me-1"></i>
        ${Math.abs(change)}% from last month
    `;
    element.className = `small ${colorClass}`;
}

// Load Products
async function loadProducts(page = 1) {
    try {
        // In a real application, you would call an API endpoint
        // For now, we'll simulate with mock data
        const mockProducts = generateMockProducts();
        
        sellerProducts = mockProducts;
        displayProducts();
        updateProductsPagination();
        
    } catch (error) {
        console.error('Error loading products:', error);
        FashionNova.showToast('Error loading products', 'danger');
    }
}

// Generate Mock Products (for demo)
function generateMockProducts() {
    return Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        sku: `SKU-${1000 + i}`,
        price: 1500 + (i * 100),
        discount_price: i % 3 === 0 ? 1200 + (i * 100) : null,
        stock_quantity: 50 - i,
        is_active: i < 20,
        images: [{ image: '/static/images/default-product.jpg' }],
        category: { name: i % 2 === 0 ? 'Men' : 'Women' },
        brand: { name: i % 3 === 0 ? 'Brand A' : 'Brand B' },
        sales: Math.floor(Math.random() * 100),
        created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));
}

// Display Products
function displayProducts() {
    const productsTable = document.getElementById('productsTable');
    if (!productsTable) return;
    
    const startIndex = (currentProductPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const pageProducts = sellerProducts.slice(startIndex, endIndex);
    
    if (pageProducts.length === 0) {
        productsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <p class="text-muted mb-0">No products found</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="showAddProductModal()">
                        Add Your First Product
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    productsTable.innerHTML = pageProducts.map(product => createProductRow(product)).join('');
    
    // Add event listeners to action buttons
    addProductActionListeners();
}

// Create Product Row
function createProductRow(product) {
    const price = product.discount_price || product.price;
    const discount = product.discount_price ? 
        Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;
    
    return `
        <tr data-product-id="${product.id}">
            <td>
                <div class="d-flex align-items-center">
                    <img src="${product.images[0].image}" 
                         class="product-thumbnail me-3" 
                         alt="${product.name}">
                    <div>
                        <h6 class="mb-1">${product.name}</h6>
                        <small class="text-muted">SKU: ${product.sku}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="fw-medium">${FashionNova.formatCurrency(price)}</div>
                ${discount > 0 ? `
                    <small class="text-danger">-${discount}%</small>
                ` : ''}
            </td>
            <td>
                <span class="badge ${product.stock_quantity > 10 ? 'bg-success' : 
                                    product.stock_quantity > 0 ? 'bg-warning' : 'bg-danger'}">
                    ${product.stock_quantity}
                </span>
            </td>
            <td>
                <span class="badge ${product.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${product.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${product.sales || 0}</td>
            <td>${FashionNova.formatDate(product.created_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="toggleProductStatus(${product.id})">
                        <i class="fas ${product.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Add Product Action Listeners
function addProductActionListeners() {
    // Add any additional event listeners here
}

// Update Products Pagination
function updateProductsPagination() {
    const pagination = document.getElementById('productsPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(sellerProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentProductPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeProductPage(${currentProductPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentProductPage - 1 && i <= currentProductPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentProductPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changeProductPage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentProductPage - 2 || i === currentProductPage + 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    paginationHTML += `
        <li class="page-item ${currentProductPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeProductPage(${currentProductPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change Product Page
function changeProductPage(page) {
    if (page < 1 || page > Math.ceil(sellerProducts.length / productsPerPage)) {
        return;
    }
    
    currentProductPage = page;
    displayProducts();
    updateProductsPagination();
}

// Load Orders
async function loadOrders(page = 1) {
    try {
        // In a real application, you would call an API endpoint
        // For now, we'll simulate with mock data
        const mockOrders = generateMockOrders();
        
        sellerOrders = mockOrders;
        displayOrders();
        updateOrdersPagination();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        FashionNova.showToast('Error loading orders', 'danger');
    }
}

// Generate Mock Orders (for demo)
function generateMockOrders() {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const customers = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis', 'Michael Wilson'];
    
    return Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        order_number: `ORD-${1000 + i}`,
        customer_name: customers[i % customers.length],
        customer_email: `customer${i}@example.com`,
        total_amount: 2500 + (i * 500),
        status: statuses[i % statuses.length],
        items_count: 1 + (i % 3),
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        shipping_address: `123 Main St, City ${i % 5}, Kenya`
    }));
}

// Display Orders
function displayOrders() {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    const startIndex = (currentOrderPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = sellerOrders.slice(startIndex, endIndex);
    
    if (pageOrders.length === 0) {
        ordersTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <p class="text-muted mb-0">No orders found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    ordersTable.innerHTML = pageOrders.map(order => createOrderRow(order)).join('');
    
    // Add event listeners to action buttons
    addOrderActionListeners();
}

// Create Order Row
function createOrderRow(order) {
    const statusColors = {
        pending: 'warning',
        confirmed: 'info',
        processing: 'primary',
        shipped: 'success',
        delivered: 'success',
        cancelled: 'danger'
    };
    
    return `
        <tr data-order-id="${order.id}">
            <td>
                <a href="/seller/orders/${order.id}/" class="text-primary text-decoration-none">
                    ${order.order_number}
                </a>
            </td>
            <td>${order.customer_name}</td>
            <td>${FashionNova.formatDate(order.created_at)}</td>
            <td>${order.items_count}</td>
            <td>${FashionNova.formatCurrency(order.total_amount)}</td>
            <td>
                <span class="badge bg-${statusColors[order.status]}">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewOrder(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'pending' ? `
                        <button class="btn btn-outline-success" onclick="updateOrderStatus(${order.id}, 'confirmed')">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : order.status === 'confirmed' ? `
                        <button class="btn btn-outline-info" onclick="updateOrderStatus(${order.id}, 'processing')">
                            <i class="fas fa-cog"></i>
                        </button>
                    ` : order.status === 'processing' ? `
                        <button class="btn btn-outline-warning" onclick="updateOrderStatus(${order.id}, 'shipped')">
                            <i class="fas fa-shipping-fast"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Add Order Action Listeners
function addOrderActionListeners() {
    // Add any additional event listeners here
}

// Update Orders Pagination
function updateOrdersPagination() {
    const pagination = document.getElementById('ordersPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(sellerOrders.length / ordersPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentOrderPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentOrderPage - 1 && i <= currentOrderPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentOrderPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changeOrderPage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentOrderPage - 2 || i === currentOrderPage + 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    paginationHTML += `
        <li class="page-item ${currentOrderPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change Order Page
function changeOrderPage(page) {
    if (page < 1 || page > Math.ceil(sellerOrders.length / ordersPerPage)) {
        return;
    }
    
    currentOrderPage = page;
    displayOrders();
    updateOrdersPagination();
}

// Show Section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${section}Section`).style.display = 'block';
    
    // Set active nav link
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Load section-specific data
    switch (section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Show Add Product Modal
function showAddProductModal() {
    const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
    modal.show();
}

// Handle Image Upload
function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('imagePreview');
    
    previewContainer.innerHTML = '';
    
    files.forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            FashionNova.showToast('Please upload image files only', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'image-preview-item';
            imgDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="btn-remove" onclick="removeImagePreview(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(imgDiv);
        };
        reader.readAsDataURL(file);
    });
}

// Remove Image Preview
function removeImagePreview(button) {
    button.closest('.image-preview-item').remove();
}

// Save Product
async function saveProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Validate form
    if (!validateProductForm(formData)) {
        return;
    }
    
    try {
        // In a real application, you would send this to your API
        // For now, we'll simulate success
        
        FashionNova.showToast('Product saved successfully', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        modal.hide();
        
        // Reset form
        e.target.reset();
        document.getElementById('imagePreview').innerHTML = '';
        
        // Reload products
        if (currentProductPage === 1) {
            loadProducts();
        } else {
            currentProductPage = 1;
            loadProducts();
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        FashionNova.showToast('Error saving product', 'danger');
    }
}

// Validate Product Form
function validateProductForm(formData) {
    let isValid = true;
    const errors = [];
    
    // Clear previous errors
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    
    // Validate required fields
    const requiredFields = ['name', 'price', 'stock_quantity', 'description'];
    requiredFields.forEach(field => {
        if (!formData.get(field)) {
            showFieldError(field, 'This field is required');
            isValid = false;
        }
    });
    
    // Validate price
    const price = parseFloat(formData.get('price'));
    if (price <= 0) {
        showFieldError('price', 'Price must be greater than 0');
        isValid = false;
    }
    
    // Validate discount price if provided
    const discountPrice = formData.get('discount_price');
    if (discountPrice) {
        const discount = parseFloat(discountPrice);
        if (discount <= 0) {
            showFieldError('discount_price', 'Discount price must be greater than 0');
            isValid = false;
        } else if (discount >= price) {
            showFieldError('discount_price', 'Discount price must be less than regular price');
            isValid = false;
        }
    }
    
    // Validate stock quantity
    const stock = parseInt(formData.get('stock_quantity'));
    if (stock < 0) {
        showFieldError('stock_quantity', 'Stock quantity cannot be negative');
        isValid = false;
    }
    
    if (!isValid) {
        FashionNova.showToast('Please correct the errors in the form', 'warning');
    }
    
    return isValid;
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

// Edit Product
function editProduct(productId) {
    // Find product
    const product = sellerProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Populate form
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productSKU').value = product.sku;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDiscountPrice').value = product.discount_price || '';
    document.getElementById('productStock').value = product.stock_quantity;
    document.getElementById('productDescription').value = product.description;
    
    // Set category and brand if available
    if (product.category) {
        document.getElementById('productCategory').value = product.category.id;
    }
    
    if (product.brand) {
        document.getElementById('productBrand').value = product.brand.id;
    }
    
    // Set gender
    if (product.gender) {
        document.querySelector(`input[name="gender"][value="${product.gender}"]`).checked = true;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
    modal.show();
}

// Toggle Product Status
async function toggleProductStatus(productId) {
    const product = sellerProducts.find(p => p.id === productId);
    if (!product) return;
    
    try {
        // In a real application, you would call an API
        product.is_active = !product.is_active;
        
        FashionNova.showToast(
            `Product ${product.is_active ? 'activated' : 'deactivated'} successfully`,
            'success'
        );
        
        // Update display
        displayProducts();
        
    } catch (error) {
        console.error('Error toggling product status:', error);
        FashionNova.showToast('Error updating product status', 'danger');
    }
}

// Delete Product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        // In a real application, you would call an API
        
        FashionNova.showToast('Product deleted successfully', 'success');
        
        // Remove from local array
        sellerProducts = sellerProducts.filter(p => p.id !== productId);
        
        // Update display
        displayProducts();
        updateProductsPagination();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        FashionNova.showToast('Error deleting product', 'danger');
    }
}

// View Order
function viewOrder(orderId) {
    window.location.href = `/seller/orders/${orderId}/`;
}

// Update Order Status
async function updateOrderStatus(orderId, newStatus) {
    try {
        // In a real application, you would call an API
        
        // Update local order
        const orderIndex = sellerOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            sellerOrders[orderIndex].status = newStatus;
        }
        
        FashionNova.showToast(`Order status updated to ${newStatus}`, 'success');
        
        // Update display
        displayOrders();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        FashionNova.showToast('Error updating order status', 'danger');
    }
}

// Load Analytics
async function loadAnalytics() {
    // This would load analytics data and display charts
    // For now, we'll just show a message
    const analyticsSection = document.getElementById('analyticsSection');
    if (analyticsSection) {
        analyticsSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Sales Analytics</h5>
                    <p class="text-muted">Analytics charts will be displayed here.</p>
                    <!-- Placeholder for charts -->
                    <div style="height: 300px; background: #f8f9fa; border-radius: 8px;" 
                         class="d-flex align-items-center justify-content-center">
                        <p class="text-muted mb-0">Charts coming soon</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Filter by Date Range
function filterByDateRange() {
    const range = document.getElementById('dateRangeFilter').value;
    FashionNova.showToast(`Filtering by ${range}`, 'info');
    
    // In a real application, you would reload data with date filters
}

// Export Products
function exportProducts() {
    // In a real application, this would generate and download a CSV/Excel file
    FashionNova.showToast('Exporting products...', 'info');
    
    // Simulate export
    setTimeout(() => {
        FashionNova.showToast('Products exported successfully', 'success');
    }, 1000);
}

// Export Orders
function exportOrders() {
    // In a real application, this would generate and download a CSV/Excel file
    FashionNova.showToast('Exporting orders...', 'info');
    
    // Simulate export
    setTimeout(() => {
        FashionNova.showToast('Orders exported successfully', 'success');
    }, 1000);
}

// Reset Forms
function resetForms() {
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
}

// Show Loading
function showLoading() {
    if (dashboardContent) {
        dashboardContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading dashboard...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when content is displayed
}

// Export for global use
window.SellerDashboard = {
    showSection,
    loadProducts,
    loadOrders,
    editProduct,
    deleteProduct,
    updateOrderStatus
};