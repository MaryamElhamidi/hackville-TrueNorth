import fs from 'fs';
import path from 'path';

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

/**
 * Load all companies from the data file
 */
export function loadCompanies(): Company[] {
  try {
    const companiesPath = path.join(process.cwd(), 'data', 'companies.json');
    const companiesData = fs.readFileSync(companiesPath, 'utf8');
    return JSON.parse(companiesData) as Company[];
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
 * In a demo app, this could be set via cookies or environment variables
 */
export function getActiveCompanyId(overrideCompanyId?: string): string | null {
  if (overrideCompanyId) return overrideCompanyId;

  // In a real app, this would come from user session/authentication
  // For demo purposes, check cookies or environment variable
  // Note: Cookies are checked server-side, localStorage client-side

  // Fallback to environment variable
  return process.env.ACTIVE_COMPANY_ID || null;
}

/**
 * Get the active company
 * In a real implementation, this would be based on user authentication/session
 */
export function getActiveCompany(overrideCompanyId?: string): Company | null {
  const activeCompanyId = getActiveCompanyId(overrideCompanyId);

  if (activeCompanyId) {
    return getCompanyById(activeCompanyId);
  }

  // No explicit selection - return null to show "Selected Company" in UI
  return null;
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
