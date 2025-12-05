// Products Page JavaScript
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};
let isLoading = false;
let productsPerPage = 12;

// DOM Elements
let productsGrid, filterForm, sortSelect, pagination;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    productsGrid = document.getElementById('productsGrid');
    filterForm = document.getElementById('filterForm');
    sortSelect = document.getElementById('sortFilter');
    pagination = document.getElementById('pagination');
    
    if (!productsGrid) return;
    
    // Load initial data
    loadCategories();
    loadBrands();
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            currentPage = 1;
            updateFilters();
            loadProducts();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentPage = 1;
            updateFilters();
            loadProducts();
        });
    }
    
    // Price range validation
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (minPriceInput && maxPriceInput) {
        minPriceInput.addEventListener('change', validatePriceRange);
        maxPriceInput.addEventListener('change', validatePriceRange);
    }
}

// Load Categories
async function loadCategories() {
    try {
        const categories = await FashionNova.getCategories();
        const categorySelect = document.getElementById('categoryFilter');
        
        if (categorySelect && categories) {
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load Brands
async function loadBrands() {
    try {
        const brands = await FashionNova.getBrands();
        const brandSelect = document.getElementById('brandFilter');
        
        if (brandSelect && brands) {
            brandSelect.innerHTML = '<option value="">All Brands</option>';
            
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id;
                option.textContent = brand.name;
                brandSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

// Update Filters
function updateFilters() {
    currentFilters = {
        page: currentPage,
        page_size: productsPerPage
    };
    
    // Get form values
    const category = document.getElementById('categoryFilter')?.value;
    const brand = document.getElementById('brandFilter')?.value;
    const gender = document.getElementById('genderFilter')?.value;
    const minPrice = document.getElementById('minPrice')?.value;
    const maxPrice = document.getElementById('maxPrice')?.value;
    const hasDiscount = document.getElementById('discountFilter')?.checked;
    const searchQuery = document.getElementById('searchQuery')?.value;
    const sortBy = sortSelect?.value;
    
    // Apply filters
    if (category) currentFilters.category = category;
    if (brand) currentFilters.brand = brand;
    if (gender) currentFilters.gender = gender;
    if (minPrice) currentFilters.min_price = minPrice;
    if (maxPrice) currentFilters.max_price = maxPrice;
    if (hasDiscount) currentFilters.has_discount = 'true';
    if (searchQuery) currentFilters.search = searchQuery;
    if (sortBy) currentFilters.ordering = sortBy;
}

// Load Products
async function loadProducts() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const response = await FashionNova.getProducts(currentFilters);
        
        if (response) {
            displayProducts(response.results || response);
            updatePagination(response.count || (response.results ? response.results.length : 0));
        }
    } catch (error) {
        console.error('Error loading products:', error);
        FashionNova.showToast('Error loading products', 'danger');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Display Products
function displayProducts(products) {
    if (!productsGrid) return;
    
    if (!products || products.length === 0) {
        productsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>No products found</h4>
                <p class="text-muted">Try adjusting your filters or search criteria</p>
                <button class="btn btn-primary" onclick="resetFilters()">
                    Reset Filters
                </button>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = products.map(product => FashionNova.createProductCard(product)).join('');
    
    // Add event listeners to new product cards
    addProductCardEventListeners();
}

// Add Product Card Event Listeners
function addProductCardEventListeners() {
    // Product name click
    document.querySelectorAll('.product-name').forEach(name => {
        name.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.closest('.product-card')?.dataset?.productId;
            if (productId) {
                window.location.href = `/product/${productId}/`;
            }
        });
    });
    
    // Product image click
    document.querySelectorAll('.product-image').forEach(img => {
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.closest('.product-card')?.dataset?.productId;
            if (productId) {
                window.location.href = `/product/${productId}/`;
            }
        });
    });
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const productId = this.closest('.product-card')?.dataset?.productId;
            if (productId) {
                await FashionNova.toggleWishlist(productId);
                updateWishlistButton(this, productId);
            }
        });
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const productId = this.closest('.product-card')?.dataset?.productId;
            if (productId) {
                await FashionNova.addToCart(productId);
            }
        });
    });
}

// Update Wishlist Button
async function updateWishlistButton(button, productId) {
    const icon = button.querySelector('i');
    
    try {
        const wishlist = await FashionNova.getWishlist();
        const isInWishlist = wishlist?.some(item => item.product === productId);
        
        if (isInWishlist) {
            icon.className = 'fas fa-heart text-danger';
            button.classList.add('active');
        } else {
            icon.className = 'far fa-heart';
            button.classList.remove('active');
        }
    } catch (error) {
        console.error('Error updating wishlist button:', error);
    }
}

// Update Pagination
function updatePagination(totalItems) {
    if (!pagination) return;
    
    totalPages = Math.ceil(totalItems / productsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${currentPage > 1 ? `changePage(${currentPage - 1})` : ''}">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1)">1</a>
            </li>
            ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        `;
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${currentPage < totalPages ? `changePage(${currentPage + 1})` : ''}">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change Page
function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    updateFilters();
    loadProducts();
    
    // Scroll to top of products grid
    productsGrid.scrollIntoView({ behavior: 'smooth' });
}

// Validate Price Range
function validatePriceRange() {
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    
    if (!minPrice || !maxPrice) return;
    
    const min = parseFloat(minPrice.value) || 0;
    const max = parseFloat(maxPrice.value) || Infinity;
    
    if (min > max) {
        FashionNova.showToast('Minimum price cannot be greater than maximum price', 'warning');
        maxPrice.value = min + 1;
    }
}

// Reset Filters
function resetFilters() {
    if (filterForm) {
        filterForm.reset();
    }
    
    if (sortSelect) {
        sortSelect.value = '';
    }
    
    currentPage = 1;
    currentFilters = {};
    
    loadProducts();
}

// Show Loading
function showLoading() {
    if (!productsGrid) return;
    
    const loadingHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading products...</p>
        </div>
    `;
    
    productsGrid.innerHTML = loadingHTML;
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when products are displayed
}

// Filter by Category (for category pages)
function filterByCategory(categoryId) {
    if (document.getElementById('categoryFilter')) {
        document.getElementById('categoryFilter').value = categoryId;
    }
    
    currentPage = 1;
    updateFilters();
    loadProducts();
}

// Filter by Brand (for brand pages)
function filterByBrand(brandId) {
    if (document.getElementById('brandFilter')) {
        document.getElementById('brandFilter').value = brandId;
    }
    
    currentPage = 1;
    updateFilters();
    loadProducts();
}

// Filter by Price Range
function filterByPrice(min, max) {
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (minPriceInput) minPriceInput.value = min;
    if (maxPriceInput) maxPriceInput.value = max;
    
    currentPage = 1;
    updateFilters();
    loadProducts();
}

// Filter by Gender
function filterByGender(gender) {
    const genderSelect = document.getElementById('genderFilter');
    if (genderSelect) {
        genderSelect.value = gender;
    }
    
    currentPage = 1;
    updateFilters();
    loadProducts();
}

// Export functions for global use
window.ProductsPage = {
    loadProducts,
    changePage,
    resetFilters,
    filterByCategory,
    filterByBrand,
    filterByPrice,
    filterByGender
};