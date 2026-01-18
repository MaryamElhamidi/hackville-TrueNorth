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
 * In a demo app, this could be set via cookies or environment variables
 */
export function getActiveCompanyId(): string | null {
  // In a real app, this would come from user session/authentication
  // For demo purposes, check if there's a specific company ID set
  // You can set this via environment variable or modify this function

  // For now, return null to use the most recently created company as default
  // In production, this would be tied to user authentication
  return process.env.ACTIVE_COMPANY_ID || null;
}

/**
 * Get the active company
 * In a real implementation, this would be based on user authentication/session
 */
export function getActiveCompany(): Company | null {
  const activeCompanyId = getActiveCompanyId();

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
