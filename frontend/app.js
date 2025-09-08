const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const button = form.querySelector('button');
const typingDiv = document.getElementById('typingIndicator');
const userList = document.getElementById('userList');
const channelList = document.getElementById('channelList');

let username = '';
while (!username) username = prompt('Enter your username:').trim();

let currentChannel = 'general';
let typingTimeout;

socket.emit('new user', username);

// Helper to get HH:MM time
function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

// Add message as bubble
function addMessage(msgObj) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message');
  wrapper.classList.add(msgObj.username === username ? 'my-message' : 'other-message');

  const meta = document.createElement('div');
  meta.classList.add('meta');
  meta.textContent = `${msgObj.username} • ${msgObj.time || getTime()}`;
  wrapper.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = msgObj.message;
  wrapper.appendChild(bubble);

  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

// Chat history
socket.on('chat history', history => {
  messages.innerHTML = '';
  history.forEach(msgObj => addMessage(msgObj));
});

// Incoming messages
socket.on('chat message', msgObj => addMessage(msgObj));

// Typing
input.addEventListener('input', () => {
  socket.emit('typing', username);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('stop typing', username), 1000);

  if(input.value.length > 1000) button.classList.add('too-long');
  else button.classList.remove('too-long');
});

socket.on('typing', user => { 
  typingDiv.textContent = user !== username ? `${user} is typing...` : ''; 
});
socket.on('stop typing', () => typingDiv.textContent = '');

// Send message
form.addEventListener('submit', e => {
  e.preventDefault();
  const message = input.value.trim();
  if(!message) return;
  if(message.length > 1000){ button.classList.add('too-long'); return; }

  socket.emit('chat message', { username, message, channel: currentChannel, time: getTime() });
  input.value = '';
  button.classList.remove('too-long');
});

// Channels
channelList.addEventListener('click', e => {
  if(e.target.tagName === 'LI') {
    currentChannel = e.target.dataset.channel;
    document.querySelector('.chat-header').textContent = `# ${currentChannel}`;
    messages.innerHTML = '';
    socket.emit('join channel', currentChannel);
  }
});

// Online users
socket.on('update users', users => {
  userList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    li.style.color = u === username ? '#fff' : '#b9bbbe';
    li.style.position = 'relative';
    li.style.paddingLeft = '12px';

    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#43b581'; // green dot
    dot.style.position = 'absolute';
    dot.style.left = '0';
    dot.style.top = '50%';
    dot.style.transform = 'translateY(-50%)';
    li.prepend(dot);

    userList.appendChild(li);
  });
});
