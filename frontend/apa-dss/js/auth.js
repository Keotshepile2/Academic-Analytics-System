document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const buttonLoader = document.getElementById('buttonLoader');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    // Check if already logged in
    checkAuthStatus();
    
    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showError('Please enter both email and password.');
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Please enter a valid email address.');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                window.location.href = data.redirect || '/apa-dss/dashboard';
            } else {
                showError(data.error || 'Invalid email or password. Please try again.');
                setLoading(false);
                passwordInput.value = '';
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Unable to connect to the server. Please try again.');
            setLoading(false);
        }
    });
    
    // Helper functions
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }
    
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    function setLoading(isLoading) {
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.classList.add('loading');
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'inline';
        } else {
            loginButton.disabled = false;
            loginButton.classList.remove('loading');
            buttonText.style.display = 'inline';
            buttonLoader.style.display = 'none';
        }
    }
    
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
                window.location.href = '/apa-dss/dashboard';
            }
        } catch (error) {
            console.log('Not authenticated or server error');
        }
    }
    
    // Allow Enter key to submit form
    passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    emailInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
});