// Authentication JavaScript
let currentForm = 'login';

// DOM Elements
let loginForm, registerForm, loginTab, registerTab;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    loginTab = document.getElementById('loginTab');
    registerTab = document.getElementById('registerTab');
    
    // Check if user is already logged in
    if (FashionNova.authToken && FashionNova.currentUser) {
        redirectBasedOnUserType();
        return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Show login form by default
    showForm('login');
});

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    if (loginTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            showForm('login');
        });
    }
    
    if (registerTab) {
        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            showForm('register');
        });
    }
    
    // Form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // User type selection
    document.querySelectorAll('input[name="userType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleSellerFields(this.value === 'seller');
        });
    });
    
    // Password toggle visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Terms and conditions link
    document.getElementById('showTerms')?.addEventListener('click', function(e) {
        e.preventDefault();
        showTermsModal();
    });
    
    // Forgot password
    document.getElementById('forgotPassword')?.addEventListener('click', function(e) {
        e.preventDefault();
        showForgotPasswordModal();
    });
}

// Show Form
function showForm(formType) {
    currentForm = formType;
    
    // Update tabs
    if (loginTab && registerTab) {
        if (formType === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
        }
    }
    
    // Update forms
    if (loginForm && registerForm) {
        if (formType === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }
    
    // Reset validation errors
    clearValidationErrors();
}

// Toggle Seller Fields
function toggleSellerFields(show) {
    const sellerFields = document.getElementById('sellerFields');
    if (sellerFields) {
        sellerFields.style.display = show ? 'block' : 'none';
        
        // Mark required fields
        const sellerInputs = sellerFields.querySelectorAll('input[required]');
        sellerInputs.forEach(input => {
            input.required = show;
        });
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    // Get form data
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate form
    if (!validateLoginForm(email, password)) {
        return;
    }
    
    // Show loading state
    setFormLoading(true, 'login');
    
    try {
        const result = await FashionNova.login(email, password);
        
        if (result) {
            // Remember me functionality
            if (rememberMe) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }
            
            FashionNova.showToast('Login successful!');
            redirectBasedOnUserType();
        }
    } catch (error) {
        // Error is already handled in the login function
    } finally {
        setFormLoading(false, 'login');
    }
}

// Validate Login Form
function validateLoginForm(email, password) {
    clearValidationErrors();
    let isValid = true;
    
    // Validate email
    if (!email) {
        showFieldError('loginEmail', 'Email is required');
        isValid = false;
    } else if (!FashionNova.validateEmail(email)) {
        showFieldError('loginEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        showFieldError('loginPassword', 'Password is required');
        isValid = false;
    } else if (password.length < 8) {
        showFieldError('loginPassword', 'Password must be at least 8 characters');
        isValid = false;
    }
    
    return isValid;
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    
    // Get form data
    const userType = document.querySelector('input[name="userType"]:checked')?.value;
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const storeName = document.getElementById('storeName')?.value.trim();
    const termsAccepted = document.getElementById('terms').checked;
    
    // Validate form
    if (!validateRegisterForm({
        userType, firstName, lastName, email, phone, 
        password, confirmPassword, storeName, termsAccepted
    })) {
        return;
    }
    
    // Prepare user data
    const userData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        password: password,
        user_type: userType
    };
    
    // Add seller-specific data
    if (userType === 'seller' && storeName) {
        userData.store_name = storeName;
    }
    
    // Show loading state
    setFormLoading(true, 'register');
    
    try {
        const result = await FashionNova.register(userData);
        
        if (result) {
            FashionNova.showToast('Registration successful!');
            redirectBasedOnUserType();
        }
    } catch (error) {
        // Error is already handled in the register function
    } finally {
        setFormLoading(false, 'register');
    }
}

// Validate Register Form
function validateRegisterForm(data) {
    clearValidationErrors();
    let isValid = true;
    
    // Validate user type
    if (!data.userType) {
        showFieldError('userTypeGroup', 'Please select user type');
        isValid = false;
    }
    
    // Validate first name
    if (!data.firstName) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    } else if (data.firstName.length < 2) {
        showFieldError('firstName', 'First name must be at least 2 characters');
        isValid = false;
    }
    
    // Validate last name
    if (!data.lastName) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    } else if (data.lastName.length < 2) {
        showFieldError('lastName', 'Last name must be at least 2 characters');
        isValid = false;
    }
    
    // Validate email
    if (!data.email) {
        showFieldError('registerEmail', 'Email is required');
        isValid = false;
    } else if (!FashionNova.validateEmail(data.email)) {
        showFieldError('registerEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone
    if (!data.phone) {
        showFieldError('phone', 'Phone number is required');
        isValid = false;
    } else if (!FashionNova.validatePhone(data.phone)) {
        showFieldError('phone', 'Please enter a valid phone number');
        isValid = false;
    }
    
    // Validate password
    if (!data.password) {
        showFieldError('registerPassword', 'Password is required');
        isValid = false;
    } else if (data.password.length < 8) {
        showFieldError('registerPassword', 'Password must be at least 8 characters');
        isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
        showFieldError('registerPassword', 
            'Password must contain at least one uppercase letter, one lowercase letter, and one number');
        isValid = false;
    }
    
    // Validate confirm password
    if (!data.confirmPassword) {
        showFieldError('confirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (data.password !== data.confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Validate store name for sellers
    if (data.userType === 'seller' && !data.storeName) {
        showFieldError('storeName', 'Store name is required for sellers');
        isValid = false;
    }
    
    // Validate terms acceptance
    if (!data.termsAccepted) {
        showFieldError('terms', 'You must accept the terms and conditions');
        isValid = false;
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
        errorElement.style.display = 'block';
    }
}

// Clear Validation Errors
function clearValidationErrors() {
    // Remove invalid class from all fields
    document.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    // Hide all error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
}

// Set Form Loading State
function setFormLoading(isLoading, formType) {
    const form = formType === 'login' ? loginForm : registerForm;
    const submitButton = form?.querySelector('button[type="submit"]');
    const inputs = form?.querySelectorAll('input, select, textarea, button');
    
    if (!form || !submitButton) return;
    
    if (isLoading) {
        // Store original button text
        if (!submitButton.dataset.originalText) {
            submitButton.dataset.originalText = submitButton.innerHTML;
        }
        
        // Show loading spinner
        submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${formType === 'login' ? 'Signing in...' : 'Creating account...'}
        `;
        submitButton.disabled = true;
        
        // Disable all inputs
        inputs?.forEach(input => {
            if (input !== submitButton) {
                input.disabled = true;
            }
        });
    } else {
        // Restore original button text
        if (submitButton.dataset.originalText) {
            submitButton.innerHTML = submitButton.dataset.originalText;
            delete submitButton.dataset.originalText;
        }
        submitButton.disabled = false;
        
        // Enable all inputs
        inputs?.forEach(input => {
            input.disabled = false;
        });
    }
}

// Redirect Based on User Type
function redirectBasedOnUserType() {
    const userType = FashionNova.getUserType();
    const redirectTo = getUrlParameter('next');
    
    if (redirectTo) {
        window.location.href = redirectTo;
    } else if (userType === 'seller') {
        window.location.href = '/seller/dashboard/';
    } else {
        window.location.href = '/';
    }
}

// Get URL Parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Show Terms Modal
function showTermsModal() {
    const modalHTML = `
        <div class="modal fade" id="termsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Terms and Conditions</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h6>1. Acceptance of Terms</h6>
                        <p>By accessing and using FashionNova, you accept and agree to be bound by the terms and provisions of this agreement.</p>
                        
                        <h6>2. User Responsibilities</h6>
                        <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.</p>
                        
                        <h6>3. Product Information</h6>
                        <p>We strive to ensure that product descriptions are accurate, but we do not warrant that product descriptions are accurate, complete, or error-free.</p>
                        
                        <h6>4. Pricing</h6>
                        <p>Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service without notice.</p>
                        
                        <h6>5. Returns and Refunds</h6>
                        <p>Our return policy lasts 30 days. If 30 days have gone by since your purchase, unfortunately we can't offer you a refund or exchange.</p>
                        
                        <h6>6. Seller Terms</h6>
                        <p>Sellers are responsible for accurate product listings, timely shipping, and customer service for their products.</p>
                        
                        <h6>7. Privacy Policy</h6>
                        <p>Your privacy is important to us. Please read our Privacy Policy to understand how we collect, use, and protect your information.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="acceptTerms()">I Accept</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('termsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('termsModal'));
    modal.show();
}

// Accept Terms
function acceptTerms() {
    document.getElementById('terms').checked = true;
    const modal = bootstrap.Modal.getInstance(document.getElementById('termsModal'));
    modal.hide();
    FashionNova.showToast('Terms accepted', 'success');
}

// Show Forgot Password Modal
function showForgotPasswordModal() {
    const modalHTML = `
        <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Reset Password</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Enter your email address and we'll send you a link to reset your password.</p>
                        
                        <form id="forgotPasswordForm">
                            <div class="mb-3">
                                <label for="resetEmail" class="form-label">Email Address</label>
                                <input type="email" class="form-control" id="resetEmail" required>
                                <div class="invalid-feedback" id="resetEmailError"></div>
                            </div>
                            
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">
                                    Send Reset Link
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('forgotPasswordModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
    
    // Add form submission handler
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
}

// Handle Forgot Password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();
    
    // Validate email
    if (!email || !FashionNova.validateEmail(email)) {
        document.getElementById('resetEmail').classList.add('is-invalid');
        document.getElementById('resetEmailError').textContent = 'Please enter a valid email address';
        return;
    }
    
    // Show loading
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
        Sending...
    `;
    submitButton.disabled = true;
    
    try {
        // In a real application, you would call your API here
        // For now, we'll simulate a successful response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        FashionNova.showToast('Password reset link sent to your email', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
        modal.hide();
        
    } catch (error) {
        FashionNova.showToast('Error sending reset link', 'danger');
    } finally {
        // Reset button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Pre-fill remembered email
function prefillRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
}

// Social Login (placeholder functions)
function loginWithGoogle() {
    FashionNova.showToast('Google login coming soon', 'info');
}

function loginWithFacebook() {
    FashionNova.showToast('Facebook login coming soon', 'info');
}

// Initialize remembered email
prefillRememberedEmail();

// Export for global use
window.AuthPage = {
    showForm,
    loginWithGoogle,
    loginWithFacebook,
    showTermsModal,
    showForgotPasswordModal
};