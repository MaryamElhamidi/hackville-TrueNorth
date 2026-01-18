import { authenticateUser, setCurrentUser } from '../services/auth.js';

const form = document.querySelector('form');
form?.addEventListener('submit', (e) => {
	e.preventDefault();

	const emailInput = document.querySelector('#email') as HTMLInputElement;
	const passwordInput = document.querySelector('#password') as HTMLInputElement;

	if (!emailInput || !passwordInput) return;

	const email = emailInput.value.trim();
	const password = passwordInput.value.trim();

	if (!email || !password) {
		alert('Please enter both email and password');
		return;
	}

	const user = authenticateUser(email, password);
	if (user) {
		setCurrentUser(user);
		window.location.href = '/dashboard';
	} else {
		alert('Invalid email or password');
	}
});
