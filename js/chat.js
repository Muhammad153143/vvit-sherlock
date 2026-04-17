const socket = io('https://sherlock-campus.onrender.com');

// Get query parameters
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('itemId');
const receiverId = urlParams.get('userId'); // For admin, this is the user. For user, this is the admin (or other user)

// Global Variables
let currentUser = null;
let currentItem = null;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const connectionStatus = document.getElementById('connectionStatus');
const itemInfo = document.getElementById('itemInfo');
const chatWithHeader = document.getElementById('chatWith');

// Check Authentication
async function checkAuth() {
    try {
        const data = await fetchAPI('/auth/me');
        currentUser = data;
        document.getElementById('logoutBtn').style.display = 'block';
        initChat();
    } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Initialize Chat
async function initChat() {
    if (!itemId) {
        alert('Item ID missing from URL');
        return;
    }

    // Load Item Details
    await loadItemDetails();

    // Load Chat History
    await loadChatHistory();

    // Join Socket Room
    socket.emit('joinRoom', { itemId });

    connectionStatus.textContent = '🟢 Connected';
    connectionStatus.style.color = '#2ecc71';
}

// Load Item Details
async function loadItemDetails() {
    try {
        const item = await fetchAPI(`/items/${itemId}`);
        currentItem = item;

        if (currentItem) {
            itemInfo.textContent = `Item: ${currentItem.title} (${currentItem.type}) | Location: ${currentItem.location}`;
            const chatPartnerName = currentUser.role === 'admin' ? (currentItem.user.name || 'User') : 'Administrator';
            chatWithHeader.textContent = `Chat with ${chatPartnerName} 💬`;
        }
    } catch (err) {
        console.error('Error loading item:', err);
    }
}

// Load Chat History
async function loadChatHistory() {
    try {
        const messages = await fetchAPI(`/chat/${itemId}`);
        
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            appendMessage(msg);
        });
        scrollToBottom();
    } catch (err) {
        console.error('Error loading chat history:', err);
    }
}

// Append Message to UI
function appendMessage(msg) {
    const isSent = msg.senderId._id === currentUser._id || msg.senderId === currentUser._id;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isSent ? 'sent' : 'received');

    const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = isSent ? 'You' : (msg.senderId.name || 'Other');

    messageDiv.innerHTML = `
        <div class="message-content">${msg.message}</div>
        <div class="message-info">
            <span>${senderName}</span>
            <span>${timestamp}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll to Bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle Form Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    const targetReceiverId = receiverId || (currentUser.role === 'admin' ? currentItem.user._id : 'admin_placeholder');

    const messageData = {
        itemId,
        receiverId: targetReceiverId,
        message,
        senderId: currentUser._id,
        createdAt: new Date()
    };

    try {
        const savedMsg = await fetchAPI('/chat/send', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        appendMessage(savedMsg);
        messageInput.value = '';
    } catch (err) {
        console.error('Error sending message:', err);
    }
});

// Socket Listeners
socket.on('receiveMessage', (msg) => {
    if (msg.itemId === itemId) {
        appendMessage(msg);
    }
});

socket.on('disconnect', () => {
    connectionStatus.textContent = '🔴 Disconnected';
    connectionStatus.style.color = '#e74c3c';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// Start
checkAuth();
