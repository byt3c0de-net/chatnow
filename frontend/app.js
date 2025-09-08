const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Ask for username
let username = '';
while (!username) {
    username = prompt('Enter your username:').trim();
}

// Add message to chat
function addMessage(msgObj) {
    const item = document.createElement('li');
    item.textContent = msgObj.message;

    // Assign class based on user
    if (msgObj.username === username) {
        item.classList.add('my-message');
    } else {
        item.classList.add('other-message');
        // Add username label
        const label = document.createElement('span');
        label.textContent = msgObj.username;
        label.classList.add('username-label');
        item.prepend(label);
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

// Display chat history
socket.on('chat history', (history) => {
    history.forEach(msgObj => addMessage(msgObj));
});

// Receive new messages
socket.on('chat message', (msgObj) => addMessage(msgObj));

// Send messages
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (message) {
        socket.emit('chat message', { username, message });
        input.value = '';
    }
});
