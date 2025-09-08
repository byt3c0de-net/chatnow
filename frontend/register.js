const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Verification code sent to email. Check your inbox.');
      window.location.href = '/login.html';
    } else {
      alert(data.error || 'Registration failed');
    }
  } catch (err) {
    console.error(err);
    alert('Registration failed');
  }
});
