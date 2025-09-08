const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const userList = document.getElementById('userList');

let username = '';
while (!username) {
  username = prompt('Enter your username:').trim();
}

// Add message to chat
function addMessage(msgObj) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  if (msgObj.username === username) {
    msgDiv.classList.add('my-message');
  }

  const meta = document.createElement('div');
  meta.classList.add('meta');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  meta.textContent = `${msgObj.username} • ${time}`;

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = msgObj.message;

  msgDiv.appendChild(meta);
  msgDiv.appendChild(bubble);
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// Chat history
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
