import { MunicipalitySummary } from './filtering.js';
import { Company } from '../company/index.js';

export interface HeatmapDataPoint {
  municipality: string;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'moderate' | 'minor';
  intensity: number; // 0-1 scale for heatmap intensity
  issues_count: number;
  affected_populations: number;
  service_gap_types: string[];
  accessibility_barriers: string[];
  color: string; // CSS color class
  summary: string;
}

/**
 * Service gap type categories for filtering
 */
export const SERVICE_GAP_TYPES = [
  'Healthcare',
  'Transportation',
  'Internet access',
  'Mental health support',
  'Disability services',
  'Other community resources'
] as const;

/**
 * Accessibility barrier types
 */
export const ACCESSIBILITY_BARRIERS = [
  'Physical barriers',
  'Digital accessibility',
  'Communication barriers',
  'Transportation barriers',
  'Economic barriers',
  'Social barriers'
] as const;

/**
 * Severity levels for impact classification
 */
export const SEVERITY_LEVELS = ['minor', 'moderate', 'severe'] as const;

/**
 * Calculate severity level based on municipality data
 */
function calculateSeverity(municipality: MunicipalitySummary): 'critical' | 'moderate' | 'minor' {
  const issuesCount = municipality.issues_count;
  const affectedPopulations = (municipality as any)?.affected_populations || 0;
  const hasSevereServices = municipality.top_services_affected.some(service =>
    ['Healthcare', 'Mental health support', 'Transportation'].includes(service)
  );

  // Critical: High issue count, large affected population, or critical services affected
  if (issuesCount >= 8 || affectedPopulations > 10000 || hasSevereServices) {
    return 'critical';
  }

  // Moderate: Medium issue count or moderate population impact
  if (issuesCount >= 4 || affectedPopulations > 5000) {
    return 'moderate';
  }

  // Minor: Low issue count and population impact
  return 'minor';
}

/**
 * Calculate heatmap intensity (0-1 scale)
 */
function calculateHeatmapIntensity(municipality: MunicipalitySummary, severity: 'critical' | 'moderate' | 'minor'): number {
  const baseIntensity = {
    critical: 0.8,
    moderate: 0.5,
    minor: 0.2
  }[severity] || 0.2;

  // Boost intensity based on issues count (max +0.2)
  const issuesBoost = Math.min(municipality.issues_count / 10, 0.2);

  // Boost intensity based on affected populations (max +0.1)
  const populationBoost = (municipality as any)?.affected_populations
    ? Math.min((municipality as any).affected_populations / 50000, 0.1)
    : 0;

  return Math.min(baseIntensity + issuesBoost + populationBoost, 1.0);
}

/**
 * Get CSS color class for severity level
 */
function getSeverityColor(severity: 'critical' | 'moderate' | 'minor'): string {
  switch (severity) {
    case 'critical':
      return '#dc2626'; // Red-600
    case 'moderate':
      return '#ea580c'; // Orange-600
    case 'minor':
      return '#16a34a'; // Green-600
    default:
      return '#6b7280'; // Gray-500
  }
}

/**
 * Infer service gap types from municipality data
 */
function inferServiceGapTypes(municipality: MunicipalitySummary): string[] {
  const services = municipality.top_services_affected;
  const inferredTypes: string[] = [];

  // Map services to gap types
  if (services.some(s => s.toLowerCase().includes('health'))) {
    inferredTypes.push('Healthcare');
  }
  if (services.some(s => s.toLowerCase().includes('transport'))) {
    inferredTypes.push('Transportation');
  }
  if (services.some(s => s.toLowerCase().includes('internet') || s.toLowerCase().includes('digital'))) {
    inferredTypes.push('Internet access');
  }
  if (services.some(s => s.toLowerCase().includes('mental'))) {
    inferredTypes.push('Mental health support');
  }
  if (services.some(s => s.toLowerCase().includes('disability'))) {
    inferredTypes.push('Disability services');
  }

  // Add "Other community resources" if no specific types found or for remaining services
  if (inferredTypes.length === 0 || services.length > inferredTypes.length) {
    inferredTypes.push('Other community resources');
  }

  return [...new Set(inferredTypes)]; // Remove duplicates
}

/**
 * Infer accessibility barriers from municipality data
 */
function inferAccessibilityBarriers(municipality: MunicipalitySummary): string[] {
  const summary = municipality.summary.toLowerCase();
  const services = municipality.top_services_affected.map(s => s.toLowerCase());
  const barriers: string[] = [];

  // Infer barriers based on summary text and services
  if (summary.includes('physical') || services.some(s => s.includes('building') || s.includes('entrance'))) {
    barriers.push('Physical barriers');
  }
  if (summary.includes('digital') || summary.includes('website') || summary.includes('online') || services.some(s => s.includes('website') || s.includes('online'))) {
    barriers.push('Digital accessibility');
  }
  if (summary.includes('communication') || summary.includes('language')) {
    barriers.push('Communication barriers');
  }
  if (summary.includes('transport') || services.some(s => s.includes('transport'))) {
    barriers.push('Transportation barriers');
  }
  if (summary.includes('economic') || summary.includes('cost') || summary.includes('afford')) {
    barriers.push('Economic barriers');
  }
  if (summary.includes('social') || summary.includes('community')) {
    barriers.push('Social barriers');
  }

  // Default to digital accessibility if no specific barriers identified
  if (barriers.length === 0) {
    barriers.push('Digital accessibility');
  }

  return barriers;
}

/**
 * Transform municipality data into heatmap format
 */
export function transformMunicipalityToHeatmapData(
  municipalities: MunicipalitySummary[],
  _company?: Company
): HeatmapDataPoint[] {
  return municipalities
    .filter(municipality => municipality.latitude && municipality.longitude)
    .map(municipality => {
      // Calculate severity based on requirements
      const severity = municipality.severity_level || calculateSeverity(municipality);

      // Calculate intensity (0-1) based on severity, issues count, and affected populations
      const intensity = calculateHeatmapIntensity(municipality, severity);

      // Determine color based on severity
      const color = getSeverityColor(severity);

      return {
        municipality: municipality.municipality,
        latitude: municipality.latitude!,
        longitude: municipality.longitude!,
        severity,
        intensity,
        issues_count: municipality.issues_count,
        affected_populations: municipality.affected_populations || 0,
        service_gap_types: municipality.service_gap_types || inferServiceGapTypes(municipality),
        accessibility_barriers: municipality.accessibility_barriers || inferAccessibilityBarriers(municipality),
        color,
        summary: municipality.summary
      };
    });
}

/**
 * Filter heatmap data based on service gap types and severity levels
 */
export function filterHeatmapData(
  data: HeatmapDataPoint[],
  filters: {
    serviceGapTypes?: string[];
    severityLevels?: string[];
  }
): HeatmapDataPoint[] {
  return data.filter(point => {
    // Filter by service gap types
    if (filters.serviceGapTypes && filters.serviceGapTypes.length > 0) {
      const hasMatchingGapType = point.service_gap_types.some(gapType =>
        filters.serviceGapTypes!.includes(gapType)
      );
      if (!hasMatchingGapType) return false;
    }

    // Filter by severity levels
    if (filters.severityLevels && filters.severityLevels.length > 0) {
      if (!filters.severityLevels.includes(point.severity)) return false;
    }

    return true;
  });
}

/**
 * Get bounds for heatmap display (Canada-focused)
 */
export function getCanadaBounds(): [[number, number], [number, number]] {
  // Canada bounds: [west, south, east, north]
  return [[-141.0, 41.7], [-52.6, 83.1]];
}

/**
 * Get default map center for Canada
 */
export function getCanadaCenter(): [number, number] {
  return [-106.3468, 56.1304]; // Geographic center of Canada
}
