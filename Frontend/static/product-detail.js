// Product Detail Page JavaScript
let currentProduct = null;
let currentImages = [];
let currentImageIndex = 0;
let quantity = 1;
let isInWishlist = false;
let productReviews = [];
let relatedProducts = [];

// DOM Elements
let mainImage, thumbnailsContainer, reviewsContainer, relatedProductsGrid;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Get product ID from URL
    const productId = getProductIdFromUrl();
    if (!productId) {
        window.location.href = '/products/';
        return;
    }
    
    // Get DOM elements
    mainImage = document.getElementById('mainImage');
    thumbnailsContainer = document.getElementById('thumbnails');
    reviewsContainer = document.getElementById('reviewsContainer');
    relatedProductsGrid = document.getElementById('relatedProducts');
    
    // Load product data
    loadProduct(productId);
    
    // Setup event listeners
    setupEventListeners();
});

// Get Product ID from URL
function getProductIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const productIndex = pathParts.indexOf('product');
    
    if (productIndex !== -1 && pathParts[productIndex + 1]) {
        return pathParts[productIndex + 1];
    }
    
    // Try query parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Setup Event Listeners
function setupEventListeners() {
    // Quantity controls
    document.getElementById('decreaseQuantity')?.addEventListener('click', decreaseQuantity);
    document.getElementById('increaseQuantity')?.addEventListener('click', increaseQuantity);
    document.getElementById('quantityInput')?.addEventListener('change', updateQuantity);
    
    // Add to cart button
    document.getElementById('addToCartBtn')?.addEventListener('click', addToCart);
    
    // Wishlist button
    document.getElementById('wishlistBtn')?.addEventListener('click', toggleWishlist);
    
    // Tab navigation
    document.querySelectorAll('.nav-tabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            showTab(this.dataset.tab);
        });
    });
    
    // Review form
    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);
    
    // Star rating
    document.querySelectorAll('.star-rating input').forEach(star => {
        star.addEventListener('change', updateStarRating);
    });
    
    // Share buttons
    document.getElementById('shareFacebook')?.addEventListener('click', shareOnFacebook);
    document.getElementById('shareTwitter')?.addEventListener('click', shareOnTwitter);
    document.getElementById('shareWhatsApp')?.addEventListener('click', shareOnWhatsApp);
    
    // Image modal
    if (mainImage) {
        mainImage.addEventListener('click', openImageModal);
    }
    
    // Keyboard navigation for images
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Load Product
async function loadProduct(productId) {
    showLoading();
    
    try {
        const product = await FashionNova.getProduct(productId);
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        currentProduct = product;
        
        // Update page title
        document.title = `${product.name} - FashionNova`;
        
        // Display product data
        displayProductData();
        loadProductImages();
        loadReviews();
        loadRelatedProducts();
        checkWishlistStatus();
        
        // Update breadcrumb
        updateBreadcrumb();
        
    } catch (error) {
        console.error('Error loading product:', error);
        FashionNova.showToast('Error loading product', 'danger');
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/products/';
        }, 2000);
        
    } finally {
        hideLoading();
    }
}

// Display Product Data
function displayProductData() {
    if (!currentProduct) return;
    
    // Basic information
    document.getElementById('productTitle').textContent = currentProduct.name;
    document.getElementById('productBrand').textContent = currentProduct.brand?.name || 'No Brand';
    document.getElementById('productDescription').textContent = currentProduct.description;
    
    // Price
    const currentPrice = currentProduct.discount_price || currentProduct.price;
    const originalPrice = currentProduct.discount_price ? currentProduct.price : null;
    
    document.getElementById('currentPrice').textContent = FashionNova.formatCurrency(currentPrice);
    
    if (originalPrice) {
        document.getElementById('originalPrice').textContent = FashionNova.formatCurrency(originalPrice);
        document.getElementById('originalPrice').style.display = 'inline';
        
        const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        document.getElementById('discountBadge').textContent = `-${discountPercentage}%`;
        document.getElementById('discountBadge').style.display = 'inline';
    } else {
        document.getElementById('originalPrice').style.display = 'none';
        document.getElementById('discountBadge').style.display = 'none';
    }
    
    // Rating
    const rating = currentProduct.average_rating || 0;
    document.getElementById('productRating').innerHTML = generateStarRating(rating);
    document.getElementById('ratingValue').textContent = rating.toFixed(1);
    document.getElementById('reviewCount').textContent = `(${currentProduct.review_count || 0} reviews)`;
    
    // Stock status
    const stockElement = document.getElementById('stockStatus');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (currentProduct.stock_quantity > 0) {
        stockElement.innerHTML = `
            <i class="fas fa-check-circle text-success me-2"></i>
            In Stock (${currentProduct.stock_quantity} available)
        `;
        stockElement.className = 'text-success';
        
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'Add to Cart';
        }
    } else {
        stockElement.innerHTML = `
            <i class="fas fa-times-circle text-danger me-2"></i>
            Out of Stock
        `;
        stockElement.className = 'text-danger';
        
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'Out of Stock';
        }
    }
    
    // Specifications
    updateSpecifications();
    
    // Seller information
    updateSellerInfo();
}

// Load Product Images
function loadProductImages() {
    if (!currentProduct || !currentProduct.images) return;
    
    currentImages = currentProduct.images;
    
    if (currentImages.length > 0) {
        // Set main image
        if (mainImage) {
            mainImage.src = currentImages[0].image;
            mainImage.alt = currentProduct.name;
        }
        
        // Create thumbnails
        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = '';
            
            currentImages.forEach((image, index) => {
                const thumbnail = document.createElement('div');
                thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                thumbnail.innerHTML = `
                    <img src="${image.image}" 
                         alt="Thumbnail ${index + 1}"
                         onclick="changeMainImage(${index})">
                `;
                thumbnailsContainer.appendChild(thumbnail);
            });
        }
    } else {
        // No images available
        if (mainImage) {
            mainImage.src = '/static/images/default-product.jpg';
        }
    }
}

// Change Main Image
function changeMainImage(index) {
    if (index < 0 || index >= currentImages.length) return;
    
    currentImageIndex = index;
    
    if (mainImage) {
        mainImage.src = currentImages[index].image;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Load Reviews
async function loadReviews() {
    if (!currentProduct) return;
    
    try {
        const reviews = await FashionNova.getProductReviews(currentProduct.id);
        productReviews = reviews || [];
        
        displayReviews();
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Display Reviews
function displayReviews() {
    if (!reviewsContainer) return;
    
    if (productReviews.length === 0) {
        reviewsContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-comment-alt fa-3x text-muted mb-3"></i>
                <h5>No reviews yet</h5>
                <p class="text-muted">Be the first to review this product!</p>
            </div>
        `;
        return;
    }
    
    reviewsContainer.innerHTML = productReviews.map(review => createReviewCard(review)).join('');
}

// Create Review Card
function createReviewCard(review) {
    const date = FashionNova.formatDate(review.created_at);
    const stars = generateStarRating(review.rating);
    
    return `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1">${review.customer_name || 'Anonymous'}</h6>
                        <small class="text-muted">${date}</small>
                    </div>
                    <div class="stars">
                        ${stars}
                    </div>
                </div>
                <p class="card-text">${review.review}</p>
                
                ${review.customer === FashionNova.currentUser?.id ? `
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary me-2" 
                                onclick="editReview(${review.id})">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="deleteReview(${review.id})">
                            <i class="fas fa-trash me-1"></i>Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Load Related Products
async function loadRelatedProducts() {
    if (!currentProduct || !relatedProductsGrid) return;
    
    try {
        const filters = {
            category: currentProduct.category?.id,
            exclude: currentProduct.id,
            limit: 4
        };
        
        const products = await FashionNova.getProducts(filters);
        relatedProducts = products?.results || products || [];
        
        displayRelatedProducts();
    } catch (error) {
        console.error('Error loading related products:', error);
    }
}

// Display Related Products
function displayRelatedProducts() {
    if (!relatedProductsGrid) return;
    
    if (relatedProducts.length === 0) {
        relatedProductsGrid.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-muted">No related products found</p>
            </div>
        `;
        return;
    }
    
    relatedProductsGrid.innerHTML = relatedProducts.map(product => FashionNova.createProductCard(product)).join('');
}

// Check Wishlist Status
async function checkWishlistStatus() {
    if (!FashionNova.authToken || !currentProduct) return;
    
    try {
        const wishlist = await FashionNova.getWishlist();
        isInWishlist = wishlist?.some(item => item.product === currentProduct.id) || false;
        
        updateWishlistButton();
    } catch (error) {
        console.error('Error checking wishlist status:', error);
    }
}

// Update Wishlist Button
function updateWishlistButton() {
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (!wishlistBtn) return;
    
    const icon = wishlistBtn.querySelector('i');
    
    if (isInWishlist) {
        wishlistBtn.classList.add('active');
        icon.className = 'fas fa-heart';
        wishlistBtn.title = 'Remove from wishlist';
    } else {
        wishlistBtn.classList.remove('active');
        icon.className = 'far fa-heart';
        wishlistBtn.title = 'Add to wishlist';
    }
}

// Toggle Wishlist
async function toggleWishlist() {
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    const result = await FashionNova.toggleWishlist(currentProduct.id);
    if (result !== null) {
        isInWishlist = result;
        updateWishlistButton();
    }
}

// Quantity Controls
function decreaseQuantity() {
    if (quantity > 1) {
        quantity--;
        updateQuantityDisplay();
    }
}

function increaseQuantity() {
    const maxStock = currentProduct?.stock_quantity || 1;
    if (quantity < maxStock) {
        quantity++;
        updateQuantityDisplay();
    }
}

function updateQuantity(e) {
    const value = parseInt(e.target.value) || 1;
    const maxStock = currentProduct?.stock_quantity || 1;
    
    if (value < 1) {
        quantity = 1;
    } else if (value > maxStock) {
        quantity = maxStock;
    } else {
        quantity = value;
    }
    
    updateQuantityDisplay();
}

function updateQuantityDisplay() {
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
        quantityInput.value = quantity;
    }
}

// Add to Cart
async function addToCart() {
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    if (!currentProduct || currentProduct.stock_quantity <= 0) {
        FashionNova.showToast('Product is out of stock', 'warning');
        return;
    }
    
    try {
        await FashionNova.addToCart(currentProduct.id, quantity);
        FashionNova.showToast('Added to cart successfully');
    } catch (error) {
        console.error('Error adding to cart:', error);
        FashionNova.showToast('Error adding to cart', 'danger');
    }
}

// Show Tab
function showTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tabs .nav-link').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Show corresponding content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}Tab`);
    });
}

// Update Star Rating Display
function updateStarRating() {
    const rating = document.querySelector('input[name="rating"]:checked')?.value || 0;
    const starsContainer = document.getElementById('starDisplay');
    
    if (starsContainer) {
        starsContainer.innerHTML = generateStarRating(rating);
    }
}

// Submit Review
async function submitReview(e) {
    e.preventDefault();
    
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!rating) {
        FashionNova.showToast('Please select a rating', 'warning');
        return;
    }
    
    if (!reviewText) {
        FashionNova.showToast('Please write a review', 'warning');
        return;
    }
    
    try {
        await FashionNova.addReview(currentProduct.id, parseInt(rating), reviewText);
        
        FashionNova.showToast('Review submitted successfully');
        
        // Reset form
        e.target.reset();
        updateStarRating();
        
        // Reload reviews
        loadReviews();
        
    } catch (error) {
        console.error('Error submitting review:', error);
        FashionNova.showToast('Error submitting review', 'danger');
    }
}

// Edit Review
async function editReview(reviewId) {
    const review = productReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    // Populate form with review data
    document.querySelector(`input[name="rating"][value="${review.rating}"]`).checked = true;
    document.getElementById('reviewText').value = review.review;
    
    // Update form submit handler
    const form = document.getElementById('reviewForm');
    const originalSubmit = form.onsubmit;
    
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const reviewText = document.getElementById('reviewText').value.trim();
        
        try {
            await FashionNova.updateReview(reviewId, parseInt(rating), reviewText);
            FashionNova.showToast('Review updated successfully');
            
            // Reset form and handler
            form.reset();
            form.onsubmit = originalSubmit;
            updateStarRating();
            
            // Reload reviews
            loadReviews();
            
        } catch (error) {
            console.error('Error updating review:', error);
            FashionNova.showToast('Error updating review', 'danger');
        }
    };
    
    // Scroll to review form
    document.getElementById('reviewForm').scrollIntoView({ behavior: 'smooth' });
}

// Delete Review
async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }
    
    try {
        await FashionNova.deleteReview(reviewId);
        FashionNova.showToast('Review deleted successfully');
        loadReviews();
    } catch (error) {
        console.error('Error deleting review:', error);
        FashionNova.showToast('Error deleting review', 'danger');
    }
}

// Update Specifications
function updateSpecifications() {
    const specsContainer = document.getElementById('specifications');
    if (!specsContainer || !currentProduct) return;
    
    const specifications = {
        'Brand': currentProduct.brand?.name || 'N/A',
        'Category': currentProduct.category?.name || 'N/A',
        'SKU': currentProduct.sku || 'N/A',
        'Gender': getGenderText(currentProduct.gender),
        'Material': '100% Cotton', // This would come from product data in a real app
        'Care Instructions': 'Machine wash cold, tumble dry low',
        'Country of Origin': 'Kenya'
    };
    
    specsContainer.innerHTML = Object.entries(specifications)
        .map(([key, value]) => `
            <div class="row border-bottom py-2">
                <div class="col-6">
                    <strong>${key}</strong>
                </div>
                <div class="col-6">
                    ${value}
                </div>
            </div>
        `).join('');
}

// Get Gender Text
function getGenderText(genderCode) {
    const genders = {
        'M': 'Men',
        'F': 'Women',
        'U': 'Unisex',
        'K': 'Kids'
    };
    return genders[genderCode] || 'Unisex';
}

// Update Seller Info
function updateSellerInfo() {
    const sellerContainer = document.getElementById('sellerInfo');
    if (!sellerContainer || !currentProduct.seller) return;
    
    sellerContainer.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title">
                    <i class="fas fa-store me-2"></i>Sold by ${currentProduct.seller_name}
                </h6>
                <div class="d-flex align-items-center mb-2">
                    <div class="stars me-2">
                        ${generateStarRating(currentProduct.seller?.rating || 0)}
                    </div>
                    <small class="text-muted">${currentProduct.seller?.rating?.toFixed(1) || '0.0'}</small>
                </div>
                <p class="card-text small text-muted mb-2">
                    ${currentProduct.seller?.total_sales || 0} sales
                </p>
                <button class="btn btn-outline-primary btn-sm" onclick="viewSellerStore()">
                    Visit Store
                </button>
            </div>
        </div>
    `;
}

// View Seller Store
function viewSellerStore() {
    if (currentProduct.seller) {
        window.location.href = `/seller/${currentProduct.seller}/`;
    }
}

// Update Breadcrumb
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('productBreadcrumb');
    if (!breadcrumb || !currentProduct) return;
    
    breadcrumb.innerHTML = `
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item"><a href="/products/">Products</a></li>
                ${currentProduct.category ? `
                    <li class="breadcrumb-item">
                        <a href="/category/${currentProduct.category.id}/">
                            ${currentProduct.category.name}
                        </a>
                    </li>
                ` : ''}
                <li class="breadcrumb-item active" aria-current="page">${currentProduct.name}</li>
            </ol>
        </nav>
    `;
}

// Generate Star Rating HTML
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

// Share Functions
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${currentProduct?.name} on FashionNova!`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${currentProduct?.name} on FashionNova!`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareOnWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${currentProduct?.name} on FashionNova! ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// Image Modal
function openImageModal() {
    if (!currentImages || currentImages.length === 0) return;
    
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');
    
    if (modalImage) {
        modalImage.src = currentImages[currentImageIndex].image;
        modalImage.alt = currentProduct?.name || 'Product Image';
    }
    
    modal.show();
}

// Keyboard Navigation
function handleKeyboardNavigation(e) {
    if (e.key === 'ArrowLeft') {
        // Previous image
        const newIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        changeMainImage(newIndex);
    } else if (e.key === 'ArrowRight') {
        // Next image
        const newIndex = (currentImageIndex + 1) % currentImages.length;
        changeMainImage(newIndex);
    } else if (e.key === 'Escape') {
        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('imageModal'));
        if (modal) {
            modal.hide();
        }
    }
}

// Show Loading
function showLoading() {
    const content = document.getElementById('productContent');
    if (content) {
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading product details...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when product is displayed
}

// Export for global use
window.ProductDetail = {
    changeMainImage,
    toggleWishlist,
    addToCart,
    shareOnFacebook,
    shareOnTwitter,
    shareOnWhatsApp
};