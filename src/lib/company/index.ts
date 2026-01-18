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
 * Get the active company (for demo purposes, returns the first company)
 * In a real implementation, this would be based on user authentication/session
 */
export function getActiveCompany(): Company | null {
  const companies = loadCompanies();
  return companies.length > 0 ? companies[0] : null;
}

/**
 * Get company by ID
 */
export function getCompanyById(companyId: string): Company | null {
  const companies = loadCompanies();
  return companies.find(company => company.companyId === companyId) ?? null;
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
