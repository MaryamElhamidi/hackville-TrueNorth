import { getActiveCompany } from '../company/index.js';
import { filterMunicipalitiesForCompany, getGapColorClass, getAccessibilityGapSeverity } from './filtering.js';
import { generateCompanySpecificSummary, generateCompanyInsights } from '../ai/summarization.js';

/**
 * Get filtered municipality data for the active company
 */
export async function getCompanyFilteredMunicipalities() {
  const company = getActiveCompany();
  if (!company) {
    return {
      company: null,
      municipalities: [],
      insights: 'No active company found.'
    };
  }

  const municipalities = filterMunicipalitiesForCompany(company);

  // Generate AI insights for the company
  const insights = await generateCompanyInsights(municipalities, company);

  // Add severity and color classes to municipalities
  const municipalitiesWithSeverity = municipalities.map(municipality => ({
    ...municipality,
    severity: getAccessibilityGapSeverity(municipality.issues_count),
    colorClass: getGapColorClass(getAccessibilityGapSeverity(municipality.issues_count))
  }));

  return {
    company,
    municipalities: municipalitiesWithSeverity,
    insights
  };
}

/**
 * Generate AI summary for a specific municipality tailored to the active company
 */
export async function getCompanySpecificMunicipalitySummary(municipalityName: string) {
  const company = getActiveCompany();
  if (!company) {
    return 'No active company found.';
  }

  const municipalities = filterMunicipalitiesForCompany(company);
  const municipality = municipalities.find(m => m.municipality === municipalityName);

  if (!municipality) {
    return `Municipality ${municipalityName} not found or not relevant to ${company.companyName}.`;
  }

  return await generateCompanySpecificSummary(municipality, company);
}

/**
 * Get the most affected services across all municipalities
 */
function getTopAffectedServices(municipalities: any[]) {
  const serviceCounts: Record<string, number> = {};

  municipalities.forEach(municipality => {
    municipality.top_services_affected.forEach((service: string) => {
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
  });

  return Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([service, count]) => ({ service, count }));
}

/**
 * Get dashboard data for the active company
 */
export async function getCompanyDashboardData() {
  const { company, municipalities, insights } = await getCompanyFilteredMunicipalities();

  // Calculate summary statistics
  const totalMunicipalities = municipalities.length;
  const totalIssues = municipalities.reduce((sum, m) => sum + m.issues_count, 0);
  const averageIssues = totalMunicipalities > 0 ? (totalIssues / totalMunicipalities).toFixed(1) : '0';

  // Group municipalities by severity
  const criticalCount = municipalities.filter(m => m.severity === 'critical').length;
  const moderateCount = municipalities.filter(m => m.severity === 'moderate').length;
  const lowCount = municipalities.filter(m => m.severity === 'low').length;

  return {
    company,
    summary: {
      totalMunicipalities,
      totalIssues,
      averageIssues,
      severityBreakdown: {
        critical: criticalCount,
        moderate: moderateCount,
        low: lowCount
      }
    },
    municipalities,
    insights,
    topServices: getTopAffectedServices(municipalities)
  };
}
