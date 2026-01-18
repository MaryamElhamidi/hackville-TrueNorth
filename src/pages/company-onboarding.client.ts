import { setCurrentUser } from '../services/auth.js';

// Pre-fill form with registration data
const pendingRegistrationJson = localStorage.getItem('pending_registration');
if (pendingRegistrationJson) {
	const registrationData = JSON.parse(pendingRegistrationJson);
	const companyNameInput = document.querySelector('#company-name') as HTMLInputElement;
	if (companyNameInput && registrationData.companyName) {
		companyNameInput.value = registrationData.companyName;
	}
}

const form = document.querySelector('form');
form?.addEventListener('submit', (e) => {
	e.preventDefault();
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	// Handle multi-selects manually since Object.fromEntries takes last value for same-name keys
	const audiences = formData.getAll('audience');
	const geoFocus = formData.getAll('geographicFocus');
	const languages = formData.getAll('languages');

	const finalData: any = {
		...data,
		audience: audiences,
		geographicFocus: geoFocus,
		languages: languages
	};

	console.log('Onboarding Data:', finalData);

	// Get pending registration data
	const pendingRegistrationJson = localStorage.getItem('pending_registration');
	if (!pendingRegistrationJson) {
		alert('No registration data found. Please start from the registration page.');
		window.location.href = '/register';
		return;
	}

	const registrationData = JSON.parse(pendingRegistrationJson);
	console.log('Registration Data:', registrationData);

	// Create new company
	const companyId = 'company_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	const newCompany = {
		companyId,
		companyName: finalData.companyName,
		companyStage: finalData.companyStage,
		industry: finalData.industry,
		description: finalData.description,
		servedCustomerTypes: finalData.audience,
		geographicFocus: finalData.geographicFocus,
		currentReach: finalData.currentReach,
		accessibilityCommitment: finalData.accessibilityConsideration,
		languagesSupported: finalData.languages,
		createdAt: new Date().toISOString()
	};

			// Create new user
			const newUser = {
				id: Date.now(),
				name: registrationData.companyName + ' Admin',
				avatar: '/avatars/default.jpg',
				email: registrationData.email,
				biography: 'Administrator for ' + finalData.companyName,
				position: 'Administrator',
				country: 'Canada',
				status: 'active',
				companyId,
				password: registrationData.password,
				company: newCompany // Include company data in user object
			};

	// Store company in localStorage
	const existingCompaniesJson = localStorage.getItem('dynamic_companies');
	const existingCompanies = existingCompaniesJson ? JSON.parse(existingCompaniesJson) : [];
	existingCompanies.push(newCompany);
	localStorage.setItem('dynamic_companies', JSON.stringify(existingCompanies));

	// Store user in localStorage
	const existingUsersJson = localStorage.getItem('dynamic_users');
	const existingUsers = existingUsersJson ? JSON.parse(existingUsersJson) : [];
	existingUsers.push(newUser);
	localStorage.setItem('dynamic_users', JSON.stringify(existingUsers));

	// Clear pending registration data
	localStorage.removeItem('pending_registration');

	// Auto-sign in the user
	setCurrentUser(newUser);

	// Redirect to dashboard
	window.location.href = '/dashboard';
});
