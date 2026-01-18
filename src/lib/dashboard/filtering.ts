import fs from 'fs';
import path from 'path';
import { Company, hasNationwideFocus, getCompanyProvinces } from '../company/index.js';

export interface MunicipalitySummary {
  municipality: string;
  summary: string;
  issues_count: number;
  top_services_affected: string[];
  locations_mentioned: string[];
  latitude?: number;
  longitude?: number;
  affected_populations?: number;
  severity_level?: 'critical' | 'moderate' | 'minor';
  service_gap_types?: string[];
  accessibility_barriers?: string[];
}

/**
 * Load municipality summaries from the data file
 */
export function loadMunicipalitySummaries(): MunicipalitySummary[] {
  try {
    const summariesPath = path.join(process.cwd(), 'municipality_summaries.json');
    const summariesData = fs.readFileSync(summariesPath, 'utf8');
    return JSON.parse(summariesData) as MunicipalitySummary[];
  } catch (error) {
    console.error('Error loading municipality summaries:', error);
    return [];
  }
}

/**
 * Filter municipality summaries based on company profile
 * Returns only municipalities relevant to the company's geographic focus
 */
export function filterMunicipalitiesForCompany(company: Company): MunicipalitySummary[] {
  const allSummaries = loadMunicipalitySummaries();

  if (hasNationwideFocus(company)) {
    // If company has nationwide focus, return all municipalities
    return allSummaries;
  }

  const companyProvinces = getCompanyProvinces(company);

  // For now, we'll use a simple heuristic to filter municipalities by province
  // In a real implementation, you'd have municipality-to-province mapping
  // For the demo, we'll assume Ontario municipalities are relevant to Ontario-focused companies
  if (companyProvinces.includes('Ontario')) {
    // Return municipalities that might be in Ontario (simple heuristic for demo)
    return allSummaries.filter(() => true); // Include all for now since we don't have province mapping
  }

  // For companies focused on specific provinces, return empty array for now
  // In a real implementation, you'd filter based on actual geographic data
  return [];
}

/**
 * Get accessibility gap severity based on issues count
 * Returns 'critical', 'moderate', or 'low'
 */
export function getAccessibilityGapSeverity(issuesCount: number): 'critical' | 'moderate' | 'low' {
  if (issuesCount >= 5) return 'critical';
  if (issuesCount >= 2) return 'moderate';
  return 'low';
}

/**
 * Get color class for accessibility gap visualization
 */
export function getGapColorClass(severity: 'critical' | 'moderate' | 'low'): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'moderate':
      return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'low':
      return 'text-green-600 bg-green-100 border-green-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}

/**
 * Get industry-specific keywords for filtering relevance
 */
function getIndustryKeywords(industry: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'Technology': ['digital', 'online', 'internet', 'app', 'software', 'platform'],
    'Healthcare': ['medical', 'health', 'clinic', 'hospital', 'care', 'treatment'],
    'Retail': ['shopping', 'store', 'commerce', 'customer', 'purchase'],
    'Transportation': ['transit', 'bus', 'train', 'parking', 'traffic', 'mobility'],
    'Education': ['school', 'learning', 'student', 'education', 'training'],
    'Financial Services': ['banking', 'finance', 'money', 'payment', 'account'],
    'Hospitality': ['hotel', 'restaurant', 'tourism', 'travel', 'accommodation'],
    'Other': ['service', 'business', 'community']
  };

  return keywordMap[industry] || keywordMap['Other'];
}

/**
 * Check if a municipality summary is relevant to a company's industry
 * This is a simplified heuristic for demo purposes
 */
export function isRelevantToIndustry(summary: MunicipalitySummary, company: Company): boolean {
  const industryKeywords = getIndustryKeywords(company.industry);

  const summaryText = summary.summary.toLowerCase();
  const hasRelevantKeywords = industryKeywords.some(keyword =>
    summaryText.includes(keyword.toLowerCase())
  );

  return hasRelevantKeywords || summary.issues_count > 0; // Include if there are any accessibility issues
}
