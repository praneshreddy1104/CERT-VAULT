// ============================================
// CERTVAULT - COMPLETE JAVASCRIPT
// ============================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ CertVault JS Loaded');
    
    // Initialize particles
    initParticles();
    
    // Setup file upload handlers
    setupFileUpload();
    
    // Setup login form
    setupLogin();
    
    // Load user name on dashboard
    loadUserName();
    
    // Load certificates if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        loadCertificates();
    }
});

// ============================================
// PARTICLES EFFECT
// ============================================
function initParticles() {
    const particles = document.getElementById('particles');
    if (!particles) return;
    
    for(let i = 0; i < 25; i++) {
        const span = document.createElement('span');
        const size = Math.random() * 10 + 5;
        span.style.width = size + 'px';
        span.style.height = size + 'px';
        span.style.left = Math.random() * 100 + '%';
        span.style.top = Math.random() * 100 + '%';
        span.style.animationDelay = Math.random() * 5 + 's';
        particles.appendChild(span);
    }
}

// ============================================
// FILE UPLOAD HANDLING
// ============================================
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    
    if (fileInput && fileName) {
        // Show filename when selected
        fileInput.addEventListener('change', function(e) {
            if (fileInput.files.length > 0) {
                fileName.textContent = fileInput.files[0].name;
                fileName.style.color = '#2ecc71';
            } else {
                fileName.textContent = '';
            }
        });
    }
}

// ============================================
// LOGIN HANDLING
// ============================================
function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPass').value;
        
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', data.user.username || email.split('@')[0]);
                localStorage.setItem('userId', data.user.id);
                
                alert('✅ Login successful!');
                window.location.href = 'dashboard.html';
            } else {
                alert('❌ ' + (data.message || 'Login failed'));
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('❌ Cannot connect to server. Make sure backend is running on port 5000');
        }
    });
}

// ============================================
// LOAD USER NAME ON DASHBOARD
// ============================================
function loadUserName() {
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
        const name = localStorage.getItem('userName') || 'Student';
        userNameSpan.textContent = name;
    }
}

// ============================================
// API BASE URL
// ============================================
const API_URL = 'http://localhost:5000/api';

// ============================================
// UPLOAD CERTIFICATE
// ============================================
async function handleUpload() {
    console.log('📤 Starting upload...');
    
    // Get file
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    // Validate file
    if (!file) {
        alert('📁 Please choose a file first!');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('📁 File too large! Maximum size is 5MB');
        return;
    }
    
    // Get form data
    const certificateName = document.getElementById('certName').value.trim();
    const issuedBy = document.getElementById('issuedBy').value.trim();
    const issueDate = document.getElementById('issueDate').value;
    
    // Validate form
    if (!certificateName || !issuedBy || !issueDate) {
        alert('📝 Please fill all fields');
        return;
    }
    
    // Get token
    const token = localStorage.getItem('token');
    if (!token) {
        alert('🔑 Please login first');
        window.location.href = 'login.html';
        return;
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('certificate', file);
    formData.append('certificateName', certificateName);
    formData.append('issuedBy', issuedBy);
    formData.append('issueDate', issueDate);
    
    try {
        console.log('📡 Sending to server...');
        
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (response.ok) {
            alert('✅ Certificate uploaded successfully!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            alert('❌ ' + (data.message || 'Upload failed'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Server connection failed. Make sure backend is running on port 5000');
    }
}

// ============================================
// LOAD CERTIFICATES
// ============================================
async function loadCertificates() {
    console.log('📋 Loading certificates...');
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/certificates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            alert('Session expired. Please login again.');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }
        
        const certificates = await response.json();
        console.log('Certificates loaded:', certificates);
        
        displayCertificates(certificates);
    } catch (error) {
        console.error('Error loading certificates:', error);
        showError('Failed to load certificates');
    }
}

// ============================================
// DISPLAY CERTIFICATES
// ============================================
function displayCertificates(certificates) {
    const container = document.getElementById('certItems');
    if (!container) return;
    
    if (!certificates || certificates.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-certificate" style="font-size: 48px; opacity: 0.3;"></i>
                <p>No certificates yet. Upload your first certificate!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    certificates.forEach(cert => {
        html += `
            <div class="cert-card">
                <h3>${escapeHtml(cert.certificateName)}</h3>
                <p><strong>🏢 Issued by:</strong> ${escapeHtml(cert.issuedBy)}</p>
                <p><strong>📅 Issue Date:</strong> ${formatDate(cert.issueDate)}</p>
                <p><strong>📎 Uploaded:</strong> ${formatDate(cert.uploadedAt)}</p>
                <div class="cert-actions">
                    <a href="${cert.fileUrl}" target="_blank" class="btn-small">👁️ View</a>
                    <button onclick="deleteCertificate('${cert._id}')" class="btn-small delete">🗑️ Delete</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// DELETE CERTIFICATE
// ============================================
async function deleteCertificate(id) {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/certificates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('✅ Certificate deleted');
            loadCertificates();
        } else {
            alert('❌ Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ Delete failed');
    }
}

// ============================================
// SHOW ABOUT
// ============================================
function showAbout() {
    alert('📚 CertVault\n\nSecure certificate storage for students.\nUpload, organize and access certificates anytime!');
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const container = document.getElementById('certItems');
    if (container) {
        container.innerHTML = `<p style="color: red; text-align: center;">❌ ${message}</p>`;
    }
}