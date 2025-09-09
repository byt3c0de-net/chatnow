const authDiv = document.getElementById('auth');
const chatDiv = document.getElementById('chat');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');

let username;
let currentChannel = 'general';
let typingTimeout;
let socket;

// --- REGISTER ---
registerBtn.addEventListener('click', async () => {
  const regUsername = document.getElementById('regUsername').value.trim();
  const regPassword = document.getElementById('regPassword').value;
  if (!regUsername || !regPassword) return alert('Enter username and password');

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: regUsername, password: regPassword })
  });
  alert(await res.text());
});

// --- LOGIN ---
loginBtn.addEventListener('click', async () => {
  const loginUsername = document.getElementById('loginUsername').value.trim();
  const loginPassword = document.getElementById('loginPassword').value;
  if (!loginUsername || !loginPassword) return alert('Enter username and password');

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: loginUsername, password: loginPassword })
  });

  if (res.ok) {
    username = loginUsername;
    authDiv.style.display = 'none';
    chatDiv.style.display = 'block';

    socket = io();
    socket.emit('join channel', { channel: currentChannel, username });
    setupSocket();
  } else {
    alert(await res.text());
  }
});

// ----------------- CHAT LOGIC -----------------
function setupSocket() {
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');
  const typingDiv = document.getElementById('typingIndicator');
  const userList = document.getElementById('userList');
  const channelList = document.getElementById('channelList');
  const button = form.querySelector('button');
  const onlineCounter = document.getElementById('onlineCount');

  function getTime() {
    const d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

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

  socket.on('chat history', history => { messages.innerHTML = ''; history.forEach(addMessage); });
  socket.on('chat message', addMessage);
  socket.on('typing', user => { typingDiv.textContent = user !== username ? `${user} is typing...` : ''; });
  socket.on('stop typing', () => typingDiv.textContent = '');
  socket.on('update users', users => {
    userList.innerHTML = '';
    onlineCounter.textContent = `Online Users: ${users.length}`;
    users.forEach(u => {
      const li = document.createElement('li');
      li.textContent = u;
      li.style.color = u === username ? '#fff' : '#b9bbbe';
      li.style.fontSize = '14px';
      li.style.position = 'relative';
      li.style.paddingLeft = '12px';

      const dot = document.createElement('span');
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.background = '#43b581';
      dot.style.position = 'absolute';
      dot.style.left = '0';
      dot.style.top = '50%';
      dot.style.transform = 'translateY(-50%)';
      li.prepend(dot);

      userList.appendChild(li);
    });
  });

  input.addEventListener('input', () => {
    socket.emit('typing', username);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('stop typing', username), 1000);
    if (input.value.length > 1000) button.classList.add('too-long');
    else button.classList.remove('too-long');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    if (message.length > 1000) { button.classList.add('too-long'); alert('Message cannot exceed 1000 chars.'); return; }
    socket.emit('chat message', { username, message, channel: currentChannel, time: getTime() });
    input.value = '';
    button.classList.remove('too-long');
  });

  channelList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      currentChannel = e.target.dataset.channel;
      document.querySelector('.chat-header').textContent = `# ${currentChannel}`;
      messages.innerHTML = '';
      socket.emit('join channel', { channel: currentChannel, username });
    }
  });
}
