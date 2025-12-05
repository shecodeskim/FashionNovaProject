// Checkout Page JavaScript
let currentStep = 1;
let orderData = {};
let paymentMethod = 'mpesa';
let checkoutInProgress = false;

// DOM Elements
let checkoutForm, paymentModal;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkoutForm = document.getElementById('checkoutForm');
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    
    // Check authentication
    if (!FashionNova.authToken) {
        window.location.href = '/login/';
        return;
    }
    
    // Load cart and user data
    loadInitialData();
    
    // Setup event listeners
    setupEventListeners();
});

// Load Initial Data
async function loadInitialData() {
    showLoading();
    
    try {
        // Load cart
        const cart = await FashionNova.getCart();
        
        if (!cart || !cart.items || cart.items.length === 0) {
            FashionNova.showToast('Your cart is empty', 'warning');
            setTimeout(() => window.location.href = '/cart/', 2000);
            return;
        }
        
        // Load user profile
        const profile = await FashionNova.getProfile();
        
        // Populate form with user data
        populateUserData(profile);
        
        // Display order summary
        displayOrderSummary(cart);
        
        // Validate stock availability
        await validateStockAvailability(cart);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        FashionNova.showToast('Error loading checkout data', 'danger');
    } finally {
        hideLoading();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Step navigation
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const step = parseInt(this.dataset.step);
            goToStep(step);
        });
    });
    
    // Next/previous buttons
    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    document.getElementById('prevStepBtn')?.addEventListener('click', prevStep);
    
    // Payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            paymentMethod = this.value;
            updatePaymentForm();
        });
    });
    
    // M-Pesa phone formatting
    document.getElementById('mpesaPhone')?.addEventListener('input', formatPhoneNumber);
    
    // Place order button
    document.getElementById('placeOrderBtn')?.addEventListener('click', placeOrder);
    
    // Form submission
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
    
    // Terms and conditions
    document.getElementById('termsCheckbox')?.addEventListener('change', function() {
        document.getElementById('placeOrderBtn').disabled = !this.checked;
    });
}

// Populate User Data
function populateUserData(profile) {
    if (!profile) return;
    
    // Personal information
    document.getElementById('firstName').value = profile.first_name || '';
    document.getElementById('lastName').value = profile.last_name || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('phone').value = profile.phone_number || '';
    
    // Shipping address (if available)
    if (profile.customer_profile?.shipping_address) {
        document.getElementById('shippingAddress').value = profile.customer_profile.shipping_address;
    }
    
    // Billing address (if different)
    if (profile.customer_profile?.billing_address) {
        document.getElementById('billingAddress').value = profile.customer_profile.billing_address;
        document.getElementById('sameAsShipping').checked = false;
    } else {
        document.getElementById('sameAsShipping').checked = true;
    }
    
    // Same as shipping checkbox
    document.getElementById('sameAsShipping')?.addEventListener('change', function() {
        const billingAddress = document.getElementById('billingAddress');
        if (this.checked) {
            billingAddress.value = document.getElementById('shippingAddress').value;
            billingAddress.disabled = true;
        } else {
            billingAddress.disabled = false;
        }
    });
}

// Display Order Summary
function displayOrderSummary(cart) {
    const summaryContainer = document.getElementById('orderSummary');
    if (!summaryContainer) return;
    
    // Calculate totals
    const subtotal = cart.total_price || 0;
    const shipping = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shipping + tax;
    
    // Update order summary
    summaryContainer.innerHTML = `
        <div class="order-summary">
            <h6 class="mb-3">Order Summary</h6>
            
            <div class="order-items mb-3">
                ${cart.items.map(item => createOrderItemHTML(item)).join('')}
            </div>
            
            <div class="order-totals">
                <div class="d-flex justify-content-between mb-2">
                    <span>Subtotal:</span>
                    <span>${FashionNova.formatCurrency(subtotal)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Shipping:</span>
                    <span>${FashionNova.formatCurrency(shipping)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Tax (16%):</span>
                    <span>${FashionNova.formatCurrency(tax)}</span>
                </div>
                <div class="d-flex justify-content-between mb-3">
                    <span>Discount:</span>
                    <span class="text-danger">-${FashionNova.formatCurrency(0)}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between mb-3">
                    <strong>Total:</strong>
                    <strong>${FashionNova.formatCurrency(total)}</strong>
                </div>
            </div>
        </div>
    `;
    
    // Store order data
    orderData = {
        subtotal,
        shipping,
        tax,
        total,
        items: cart.items
    };
}

// Create Order Item HTML
function createOrderItemHTML(item) {
    const product = item.product_details;
    const price = product.discount_price || product.price;
    const total = price * item.quantity;
    
    return `
        <div class="order-item d-flex justify-content-between align-items-center mb-2">
            <div>
                <div class="fw-medium">${product.name}</div>
                <small class="text-muted">Qty: ${item.quantity} × ${FashionNova.formatCurrency(price)}</small>
            </div>
            <div class="fw-medium">${FashionNova.formatCurrency(total)}</div>
        </div>
    `;
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

// Validate Stock Availability
async function validateStockAvailability(cart) {
    const outOfStockItems = [];
    
    for (const item of cart.items) {
        const product = item.product_details;
        if (item.quantity > product.stock_quantity) {
            outOfStockItems.push({
                product: product.name,
                requested: item.quantity,
                available: product.stock_quantity
            });
        }
    }
    
    if (outOfStockItems.length > 0) {
        let message = 'Some items in your cart have insufficient stock:\n';
        outOfStockItems.forEach(item => {
            message += `\n• ${item.product}: ${item.requested} requested, ${item.available} available`;
        });
        
        alert(message);
        
        // Redirect to cart page
        window.location.href = '/cart/';
        return false;
    }
    
    return true;
}

// Step Navigation
function goToStep(step) {
    // Validate current step before proceeding
    if (step > currentStep && !validateStep(currentStep)) {
        return;
    }
    
    // Hide all steps
    document.querySelectorAll('.checkout-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Remove active class from all step indicators
    document.querySelectorAll('.step-indicator .step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Activate step indicator
    document.querySelector(`.step-indicator .step[data-step="${step}"]`).classList.add('active');
    
    // Update current step
    currentStep = step;
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Validate Step
function validateStep(step) {
    let isValid = true;
    const errors = [];
    
    // Clear previous errors
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    
    switch (step) {
        case 1: // Personal Information
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            
            if (!firstName) {
                showFieldError('firstName', 'First name is required');
                isValid = false;
            }
            
            if (!lastName) {
                showFieldError('lastName', 'Last name is required');
                isValid = false;
            }
            
            if (!email) {
                showFieldError('email', 'Email is required');
                isValid = false;
            } else if (!FashionNova.validateEmail(email)) {
                showFieldError('email', 'Please enter a valid email address');
                isValid = false;
            }
            
            if (!phone) {
                showFieldError('phone', 'Phone number is required');
                isValid = false;
            } else if (!FashionNova.validatePhone(phone)) {
                showFieldError('phone', 'Please enter a valid phone number');
                isValid = false;
            }
            
            if (isValid) {
                orderData.personalInfo = { firstName, lastName, email, phone };
            }
            break;
            
        case 2: // Shipping Information
            const shippingAddress = document.getElementById('shippingAddress').value.trim();
            const city = document.getElementById('city').value.trim();
            const postalCode = document.getElementById('postalCode').value.trim();
            
            if (!shippingAddress) {
                showFieldError('shippingAddress', 'Shipping address is required');
                isValid = false;
            }
            
            if (!city) {
                showFieldError('city', 'City is required');
                isValid = false;
            }
            
            if (isValid) {
                orderData.shippingInfo = {
                    address: shippingAddress,
                    city,
                    postalCode
                };
                
                // Set billing address if same as shipping
                if (document.getElementById('sameAsShipping').checked) {
                    orderData.billingInfo = { ...orderData.shippingInfo };
                } else {
                    const billingAddress = document.getElementById('billingAddress').value.trim();
                    if (!billingAddress) {
                        showFieldError('billingAddress', 'Billing address is required');
                        isValid = false;
                    } else {
                        orderData.billingInfo = {
                            address: billingAddress,
                            city,
                            postalCode
                        };
                    }
                }
            }
            break;
            
        case 3: // Payment Information
            if (paymentMethod === 'mpesa') {
                const mpesaPhone = document.getElementById('mpesaPhone').value.trim();
                
                if (!mpesaPhone) {
                    showFieldError('mpesaPhone', 'M-Pesa phone number is required');
                    isValid = false;
                } else if (!FashionNova.validatePhone(mpesaPhone)) {
                    showFieldError('mpesaPhone', 'Please enter a valid M-Pesa phone number');
                    isValid = false;
                }
                
                if (isValid) {
                    orderData.paymentInfo = {
                        method: 'mpesa',
                        phone: mpesaPhone
                    };
                }
            } else if (paymentMethod === 'card') {
                // Validate card details
                const cardNumber = document.getElementById('cardNumber').value.trim();
                const cardExpiry = document.getElementById('cardExpiry').value.trim();
                const cardCVC = document.getElementById('cardCVC').value.trim();
                const cardName = document.getElementById('cardName').value.trim();
                
                if (!cardNumber) {
                    showFieldError('cardNumber', 'Card number is required');
                    isValid = false;
                } else if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
                    showFieldError('cardNumber', 'Please enter a valid 16-digit card number');
                    isValid = false;
                }
                
                if (!cardExpiry) {
                    showFieldError('cardExpiry', 'Expiry date is required');
                    isValid = false;
                } else if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                    showFieldError('cardExpiry', 'Please enter a valid expiry date (MM/YY)');
                    isValid = false;
                }
                
                if (!cardCVC) {
                    showFieldError('cardCVC', 'CVC is required');
                    isValid = false;
                } else if (!/^\d{3,4}$/.test(cardCVC)) {
                    showFieldError('cardCVC', 'Please enter a valid CVC');
                    isValid = false;
                }
                
                if (!cardName) {
                    showFieldError('cardName', 'Name on card is required');
                    isValid = false;
                }
                
                if (isValid) {
                    orderData.paymentInfo = {
                        method: 'card',
                        cardNumber,
                        cardExpiry,
                        cardCVC,
                        cardName
                    };
                }
            } else if (paymentMethod === 'cod') {
                orderData.paymentInfo = {
                    method: 'cod'
                };
            }
            break;
    }
    
    if (!isValid) {
        FashionNova.showToast('Please correct the errors in the form', 'warning');
    }
    
    return isValid;
}

// Show Field Error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`) || 
                         field.parentElement.querySelector('.error-message');
    
    if (field) {
        field.classList.add('is-invalid');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Next Step
function nextStep() {
    if (validateStep(currentStep)) {
        if (currentStep < 4) {
            goToStep(currentStep + 1);
        } else {
            placeOrder();
        }
    }
}

// Previous Step
function prevStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// Update Navigation Buttons
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
    }
    
    if (nextBtn) {
        if (currentStep < 4) {
            nextBtn.textContent = 'Continue';
            nextBtn.classList.remove('btn-success');
            nextBtn.classList.add('btn-primary');
        } else {
            nextBtn.textContent = 'Place Order';
            nextBtn.classList.remove('btn-primary');
            nextBtn.classList.add('btn-success');
        }
    }
}

// Update Payment Form
function updatePaymentForm() {
    // Hide all payment forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Show selected payment form
    document.getElementById(`${paymentMethod}Form`).style.display = 'block';
}

// Format Phone Number
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.startsWith('0')) {
        value = value.substring(1);
    }
    
    if (value.length > 9) {
        value = value.substring(0, 9);
    }
    
    if (value.length > 0) {
        value = `0${value}`;
    }
    
    e.target.value = value;
}

// Place Order
async function placeOrder() {
    if (checkoutInProgress) return;
    
    // Validate final step
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Validate terms and conditions
    if (!document.getElementById('termsCheckbox').checked) {
        FashionNova.showToast('Please accept the terms and conditions', 'warning');
        return;
    }
    
    checkoutInProgress = true;
    
    try {
        // Prepare order data
        const orderPayload = {
            shipping_address: `${orderData.shippingInfo.address}, ${orderData.shippingInfo.city}, ${orderData.shippingInfo.postalCode || ''}`.trim(),
            billing_address: `${orderData.billingInfo.address}, ${orderData.billingInfo.city}, ${orderData.billingInfo.postalCode || ''}`.trim(),
            payment_method: orderData.paymentInfo.method,
            notes: document.getElementById('orderNotes')?.value.trim() || ''
        };
        
        // Show payment modal
        paymentModal.show();
        document.getElementById('paymentMessage').textContent = 'Processing your order...';
        
        // Create order
        const order = await FashionNova.createOrder(orderPayload);
        
        if (!order) {
            throw new Error('Failed to create order');
        }
        
        // Process payment based on method
        if (orderData.paymentInfo.method === 'mpesa') {
            await processMpesaPayment(order);
        } else if (orderData.paymentInfo.method === 'card') {
            await processCardPayment(order);
        } else if (orderData.paymentInfo.method === 'cod') {
            await processCODPayment(order);
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        
        paymentModal.hide();
        FashionNova.showToast(`Order failed: ${error.message}`, 'danger');
        
        checkoutInProgress = false;
    }
}

// Process M-Pesa Payment
async function processMpesaPayment(order) {
    try {
        document.getElementById('paymentMessage').textContent = 'Initiating M-Pesa payment...';
        
        // Format phone number
        let phone = orderData.paymentInfo.phone;
        if (phone.startsWith('0')) {
            phone = '254' + phone.substring(1);
        }
        
        // Initiate M-Pesa payment
        const paymentResponse = await FashionNova.initiateMpesaPayment(
            order.id,
            phone,
            orderData.total
        );
        
        if (paymentResponse && paymentResponse.success) {
            document.getElementById('paymentMessage').textContent = 
                'Payment initiated. Please check your phone to complete payment.';
            
            // Poll for payment status
            await pollPaymentStatus(paymentResponse.checkout_request_id, order.id);
        } else {
            throw new Error(paymentResponse?.error || 'Failed to initiate M-Pesa payment');
        }
    } catch (error) {
        throw new Error(`M-Pesa payment failed: ${error.message}`);
    }
}

// Process Card Payment
async function processCardPayment(order) {
    // In a real application, this would integrate with a payment gateway
    // For now, we'll simulate a successful payment
    
    document.getElementById('paymentMessage').textContent = 'Processing card payment...';
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful payment
    document.getElementById('paymentMessage').textContent = 'Payment successful!';
    
    // Update order status
    await updateOrderStatus(order.id, 'paid');
    
    // Redirect to confirmation
    setTimeout(() => {
        paymentModal.hide();
        redirectToConfirmation(order.id);
    }, 1000);
}

// Process COD Payment
async function processCODPayment(order) {
    document.getElementById('paymentMessage').textContent = 'Confirming your order...';
    
    // Update order status
    await updateOrderStatus(order.id, 'pending');
    
    // Redirect to confirmation
    setTimeout(() => {
        paymentModal.hide();
        redirectToConfirmation(order.id);
    }, 1000);
}

// Poll Payment Status
async function pollPaymentStatus(checkoutRequestId, orderId) {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes (30 * 10 seconds)
    
    const pollInterval = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
            clearInterval(pollInterval);
            document.getElementById('paymentMessage').textContent = 
                'Payment timeout. Please check your phone and try again.';
            
            setTimeout(() => {
                paymentModal.hide();
                checkoutInProgress = false;
            }, 3000);
            return;
        }
        
        try {
            const status = await FashionNova.checkPaymentStatus(checkoutRequestId);
            
            if (status.ResultCode === '0') {
                // Payment successful
                clearInterval(pollInterval);
                document.getElementById('paymentMessage').textContent = 
                    'Payment successful! Order confirmed.';
                
                // Update order status
                await updateOrderStatus(orderId, 'paid');
                
                // Redirect to confirmation
                setTimeout(() => {
                    paymentModal.hide();
                    redirectToConfirmation(orderId);
                }, 2000);
                
            } else if (status.ResultCode !== '1037') {
                // Payment failed (1037 is "Request timed out")
                clearInterval(pollInterval);
                document.getElementById('paymentMessage').textContent = 
                    status.ResultDesc || 'Payment failed';
                
                setTimeout(() => {
                    paymentModal.hide();
                    checkoutInProgress = false;
                }, 3000);
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }, 10000); // Check every 10 seconds
}

// Update Order Status
async function updateOrderStatus(orderId, status) {
    try {
        // In a real application, you would call an API to update the order status
        // For now, we'll just log it
        console.log(`Order ${orderId} status updated to: ${status}`);
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

// Redirect to Confirmation
function redirectToConfirmation(orderId) {
    checkoutInProgress = false;
    window.location.href = `/order-confirmation/${orderId}/`;
}

// Show Loading
function showLoading() {
    const content = document.getElementById('checkoutContent');
    if (content) {
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading checkout...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    // Loading state is cleared when content is displayed
}

// Export for global use
window.CheckoutPage = {
    goToStep,
    nextStep,
    prevStep,
    placeOrder
};