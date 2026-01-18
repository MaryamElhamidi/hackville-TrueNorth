import type { playgroundActions } from '../pages/playground/_actions.js';

export type Products = Product[];
export interface Product {
	name: string;
	category: string;
	technology: string;
	id: number;
	description: string;
	price: string;
	discount: string;
}

export interface Company {
	companyId: string;
	companyName: string;
	companyStage: string;
	industry: string;
	description: string;
	servedCustomerTypes: string[];
	geographicFocus: string[];
	currentReach: string;
	accessibilityCommitment: string;
	languagesSupported: string[];
	createdAt: string;
}

export type Users = User[];
export interface User {
	id: number;
	name: string;
	avatar: string;
	email: string;
	biography: string;
	position: string;
	country: string;
	status: string;
	companyId?: string;
	password?: string;
	company?: Company;
}

export type PlaygroundAction = (typeof playgroundActions)[number];
