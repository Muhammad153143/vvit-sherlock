// Base configuration
const API_URL = '/api/v1';

// Helper function to handle fetch errors
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const text = await response.text();   // 👈 get raw response first

    let data;
    try {
        data = JSON.parse(text);          // 👈 try converting to JSON
    } catch (err) {
        console.error("Server returned non-JSON:", text);
        throw new Error("Server error. Please try again.");
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

// Check auth status
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    return { token, user };
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Update Navbar based on Auth
document.addEventListener('DOMContentLoaded', () => {
    const { token, user } = checkAuth();
    const navLinks = document.getElementById('navLinks');
    
    if (navLinks && token && user) {
        if (user.role === 'admin') {
            navLinks.innerHTML = `
                <a href="admin-dashboard.html">Dashboard</a>
                <a href="#" onclick="logout()">Logout</a>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="index.html">Home</a>
                <a href="my-reports.html">My Reports</a>
                <a href="#" onclick="logout()">Logout</a>
            `;
        }
        
        // Update hero actions if on index page
        const heroActions = document.getElementById('hero-actions');
        if (heroActions) {
            heroActions.innerHTML = `
                <a href="report-item.html?type=lost" class="btn">Report Lost Item</a>
                <a href="report-item.html?type=found" class="btn btn-secondary">Report Found Item</a>
            `;
        }
    }

    // Add unread counts handling
    if (token) {
        updateUnreadCounts();
        // Periodically check for new messages
        setInterval(updateUnreadCounts, 10000);
    }
});

async function updateUnreadCounts() {
    try {
        const unreadCounts = await fetchAPI('/chat/unread/counts');
        const countMap = {};
        unreadCounts.forEach(item => {
            countMap[item._id] = item.count;
        });

        // Store globally for other scripts to use
        window.unreadChatCounts = countMap;
        
        // Trigger UI update if function exists
        if (typeof renderUnreadBadges === 'function') {
            renderUnreadBadges();
        }
    } catch (err) {
        console.error('Error fetching unread counts:', err);
    }
}
