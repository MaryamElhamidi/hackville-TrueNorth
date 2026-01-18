import type { APIRoute } from 'astro';
import * as operations from '../../services/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/* Map REST API endpoints to internal operations
  (GETs only for illustration purpose) */
export const endpointsToOperations = {
	products: operations.getProducts,
	users: operations.getUsers,
	onboarding: null, // Special case for onboarding POST
};

function parseTypeParam(endpoint: string | undefined) {
	if (!endpoint || !(endpoint in endpointsToOperations)) return undefined;
	return endpoint as keyof typeof endpointsToOperations;
}

// Normalization maps
const normalizeCompanyStage = (stage: string): string => {
	switch (stage) {
		case 'Idea / Pre-launch':
			return 'idea';
		case 'Launched (Early)':
			return 'early';
		case 'Scaling':
			return 'scaling';
		default:
			return 'idea';
	}
};

const normalizeServedCustomerTypes = (audiences: string[]): string[] => {
	const mapping: Record<string, string> = {
		'Individuals': 'individuals',
		'Small businesses': 'small_businesses',
		'Enterprises': 'enterprises',
		'Non-profits': 'non_profits',
		'Government / public sector': 'government',
	};

	return audiences.map(audience => mapping[audience] || audience).filter(Boolean);
};

const normalizeCurrentReach = (reach: string): string => {
	switch (reach) {
		case 'Concept only':
			return 'concept_only';
		case 'Pilot users':
			return 'pilot_users';
		case 'Active users':
			return 'active_users';
		case 'Growing customer base':
			return 'growing_customer_base';
		default:
			return 'concept_only';
	}
};

const normalizeAccessibilityCommitment = (commitment: string): string => {
	switch (commitment) {
		case 'Yes, intentionally':
			return 'intentional';
		case 'Somewhat':
			return 'somewhat';
		case 'Not yet, but we want to':
			return 'not_yet';
		default:
			return 'not_yet';
	}
};

const normalizeLanguages = (languages: string[], other?: string): string[] => {
	const normalized = [...languages];
	if (other && other.trim()) {
		normalized.push(other.trim());
	}
	return normalized;
};

async function handleOnboardingPost(request: Request): Promise<Response> {
	try {
		const formData = await request.json();

		// Normalize the form data to match the schema
		const normalizedData = {
			companyId: randomUUID(),
			companyName: formData.companyName || '',
			companyStage: normalizeCompanyStage(formData.companyStage || ''),
			industry: formData.industry || '',
			description: formData.description || '',
			servedCustomerTypes: normalizeServedCustomerTypes(formData.audience || []),
			geographicFocus: formData.geographicFocus || [],
			currentReach: normalizeCurrentReach(formData.currentReach || ''),
			accessibilityCommitment: normalizeAccessibilityCommitment(formData.accessibilityConsideration || ''),
			languagesSupported: normalizeLanguages(formData.languages || [], formData.languagesOther),
			createdAt: new Date().toISOString(),
		};

		// Save to 'data/companies.json'
		const filePath = path.join(process.cwd(), 'data', 'companies.json');

		let companies = [];
		try {
			// Try to read existing file
			const content = await fs.readFile(filePath, 'utf-8');
			const parsed = JSON.parse(content);
			// Handle case where file contains a single object (schema template)
			companies = Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			// File doesn't exist or is empty, start with empty array
			companies = [];
		}

		// Append new company
		companies.push(normalizedData);

		// Write back to file
		await fs.writeFile(filePath, JSON.stringify(companies, null, 2));

		return new Response(JSON.stringify({
			success: true,
			companyId: normalizedData.companyId,
			message: 'Company profile saved successfully'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error saving company data:', error);
		return new Response(JSON.stringify({
			error: 'Failed to save company data',
			details: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/* Controllers */

export const get: APIRoute = ({ params /* , request */ }) => {
	console.log('Hit!', params.entity);

	const operationName = parseTypeParam(params.entity);

	if (!operationName) return new Response('404', { status: 404 });

	const operation = endpointsToOperations[operationName];

	if (operation === null) {
		// Special case for onboarding
		return new Response(JSON.stringify({ message: 'Onboarding endpoint - use POST' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = operation();

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
		},
	});
};

export const post: APIRoute = async ({ params, request }) => {
	console.log('POST Hit!', params.entity);

	if (params.entity === 'onboarding') {
		return handleOnboardingPost(request);
	}

	return new Response('404', { status: 404 });
};

/* ... */

/* Astro's static build helper, can be removed for SSR mode */
export function getStaticPaths() {
	return Object.keys(endpointsToOperations).map((endpoint) => ({
		params: { entity: endpoint },
	}));
}
