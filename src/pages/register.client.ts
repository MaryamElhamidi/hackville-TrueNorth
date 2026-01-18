const form = document.querySelector('form');
form?.addEventListener('submit', (e) => {
	e.preventDefault();

	const companyNameInput = document.querySelector('#company-name') as HTMLInputElement;
	const emailInput = document.querySelector('#email') as HTMLInputElement;
	const passwordInput = document.querySelector('#password') as HTMLInputElement;
	const companyTypeInput = document.querySelector('#company-type') as HTMLSelectElement;

	if (!companyNameInput || !emailInput || !passwordInput || !companyTypeInput) return;

	const registrationData = {
		companyName: companyNameInput.value.trim(),
		email: emailInput.value.trim(),
		password: passwordInput.value.trim(),
		companyType: companyTypeInput.value
	};

	// Store registration data for the onboarding process
	localStorage.setItem('pending_registration', JSON.stringify(registrationData));

	window.location.href = '/company-onboarding';
});
