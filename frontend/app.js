const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const button = form.querySelector('button');

// Ask for username
let username = '';
while (!username) {
  username = prompt('Enter your username:').trim();
}

// Get current time in HH:MM format
function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' +
         d.getMinutes().toString().padStart(2,'0');
}

// Add message to chat
function addMessage(msgObj) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message');
  if (msgObj.username === username) wrapper.classList.add('my-message');

  // Username label
  const label = document.createElement('span');
  label.textContent = msgObj.username;
  label.classList.add('username-label');
  wrapper.appendChild(label);

  // Message text
  const text = document.createElement('span');
  text.textContent = msgObj.message;
  wrapper.appendChild(text);

  // Timestamp
  const ts = document.createElement('span');
  ts.textContent = msgObj.time || getTime();
  ts.classList.add('timestamp');
  wrapper.appendChild(ts);

  messages.appendChild(wrapper);
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
  if (!message) return;

  if (message.length > 1000) {
    button.classList.add('too-long');
    return; // prevent sending
  }

  socket.emit('chat message', { username, message, time: getTime() });
  input.value = '';
  button.classList.remove('too-long');
});

// Input length check
input.addEventListener('input', () => {
  if (input.value.length > 1000) {
    button.classList.add('too-long');
  } else {
    button.classList.remove('too-long');
  }
});
