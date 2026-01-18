import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '../../services/auth.js';
import type { Company } from '../../types/entities.js';

/**
 * Load all companies from the data file and localStorage
 */
export function loadCompanies(): Company[] {
  try {
    const companiesPath = path.join(process.cwd(), 'data', 'companies.json');
    const companiesData = fs.readFileSync(companiesPath, 'utf8');
    const staticCompanies = JSON.parse(companiesData) as Company[];

    // Load dynamically created companies from localStorage (for client-side)
    if (typeof window !== 'undefined') {
      const dynamicCompaniesJson = localStorage.getItem('dynamic_companies');
      const dynamicCompanies: Company[] = dynamicCompaniesJson ? (JSON.parse(dynamicCompaniesJson) as Company[]) : [];
      return [...staticCompanies, ...dynamicCompanies];
    }

    return staticCompanies;
  } catch (error) {
    console.error('Error loading companies:', error);
    return [];
  }
}

/**
 * Get company by ID
 */
export function getCompanyById(companyId: string): Company | null {
  const companies = loadCompanies();
  return companies.find(company => company.companyId === companyId) ?? null;
}

/**
 * Get the active company ID from environment/storage
 * In a demo app, this could be set via localStorage or environment variables
 */
export function getActiveCompanyId(): string | null {
  // First, check if user is logged in and has an associated company
  const currentUser = getCurrentUser();
  if (currentUser?.companyId) {
    return currentUser.companyId;
  }

  // Fallback: check environment variable for demo purposes
  return process.env.ACTIVE_COMPANY_ID || null;
}

/**
 * Get the active company
 * In a real implementation, this would be based on user authentication/session
 */
export function getActiveCompany(): Company | null {
  const currentUser = getCurrentUser();

  // If user has company data embedded, use that (for newly created companies)
  if (currentUser?.company) {
    return currentUser.company;
  }

  // Otherwise, try to find the company by ID
  const activeCompanyId = getActiveCompanyId();
  if (activeCompanyId) {
    return getCompanyById(activeCompanyId);
  }

  // Fallback: return the most recently created company (last in array)
  // This ensures newly onboarded companies are shown by default
  const companies = loadCompanies();
  return companies.length > 0 ? companies[companies.length - 1] ?? null : null;
}

/**
 * Check if a company has nationwide focus
 */
export function hasNationwideFocus(company: Company): boolean {
  return company.geographicFocus.includes('Nationwide');
}

/**
 * Get provinces that a company focuses on
 */
export function getCompanyProvinces(company: Company): string[] {
  return company.geographicFocus.filter(focus => focus !== 'Nationwide');
}
