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
  top_services_affected: string[]; // Top services affected (1-3 words summary)
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
  const affectedPopulations = municipality.affected_populations || 0;
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
  const populationBoost = municipality.affected_populations
    ? Math.min(municipality.affected_populations / 50000, 0.1)
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
 * Ontario geographic bounds for validation
 */
const ONTARIO_BOUNDS = {
  minLat: 41.6,    // Southern Ontario
  maxLat: 56.9,    // Northern Ontario
  minLng: -95.2,   // Western Ontario
  maxLng: -74.3    // Eastern Ontario
};

/**
 * Validate and normalize coordinates to ensure they're within Ontario bounds
 */
function validateCoordinates(lat: number, lng: number): { lat: number; lng: number } | null {
  // Check if coordinates are within reasonable bounds
  if (!lat || !lng || lat === 0 || lng === 0) {
    return null;
  }

  // Check if coordinates are within Ontario bounds
  if (lat < ONTARIO_BOUNDS.minLat || lat > ONTARIO_BOUNDS.maxLat ||
      lng < ONTARIO_BOUNDS.minLng || lng > ONTARIO_BOUNDS.maxLng) {
    console.warn(`Coordinates for municipality outside Ontario bounds: lat=${lat}, lng=${lng}`);
    return null;
  }

  return { lat, lng };
}

/**
 * Generate fallback coordinates for municipalities without valid coordinates
 * Using a grid pattern to distribute markers evenly across Ontario
 */
function generateFallbackCoordinates(municipalityName: string, index: number): { lat: number; lng: number } {
  // Ontario center coordinates
  const centerLat = 46.0;
  const centerLng = -81.0;

  // Grid spacing (approximately 1.5 degrees = ~166km)
  const spacing = 1.5;

  // Create a grid pattern
  const row = Math.floor(index / 8); // 8 columns
  const col = index % 8;

  // Add some randomness to prevent perfect grid alignment
  const randomLat = (Math.random() - 0.5) * 0.5;
  const randomLng = (Math.random() - 0.5) * 0.5;

  const lat = centerLat + (row * spacing) + randomLat;
  const lng = centerLng + (col * spacing) + randomLng;

  // Ensure coordinates stay within Ontario bounds
  const finalLat = Math.max(ONTARIO_BOUNDS.minLat, Math.min(ONTARIO_BOUNDS.maxLat, lat));
  const finalLng = Math.max(ONTARIO_BOUNDS.minLng, Math.min(ONTARIO_BOUNDS.maxLng, lng));

  console.warn(`Using fallback coordinates for ${municipalityName}: lat=${finalLat.toFixed(4)}, lng=${finalLng.toFixed(4)}`);

  return { lat: finalLat, lng: finalLng };
}

/**
 * Transform municipality data into heatmap format
 */
export function transformMunicipalityToHeatmapData(
  municipalities: MunicipalitySummary[],
  _company?: Company
): HeatmapDataPoint[] {
  let fallbackCount = 0;

  return municipalities
    .map((municipality) => {
      let coordinates: { lat: number; lng: number } | null = null;

      // Try to use existing coordinates if valid
      if (municipality.latitude && municipality.longitude) {
        coordinates = validateCoordinates(municipality.latitude, municipality.longitude);
      }

      // If no valid coordinates, generate fallback
      if (!coordinates) {
        const fallbackIndex = fallbackCount;
        fallbackCount += 1;
        coordinates = generateFallbackCoordinates(municipality.municipality, fallbackIndex);
      }

      if (!coordinates) {
        console.error(`Could not generate valid coordinates for ${municipality.municipality}`);
        return null;
      }

      // Calculate severity based on requirements
      const severity = municipality.severity_level || calculateSeverity(municipality);

      // Calculate intensity (0-1) based on severity, issues count, and affected populations
      const intensity = calculateHeatmapIntensity(municipality, severity);

      // Determine color based on severity
      const color = getSeverityColor(severity);

      return {
        municipality: municipality.municipality,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        severity,
        intensity,
        issues_count: municipality.issues_count,
        affected_populations: municipality.affected_populations ?? 0,
        service_gap_types: municipality.service_gap_types ?? inferServiceGapTypes(municipality),
        accessibility_barriers: municipality.accessibility_barriers ?? inferAccessibilityBarriers(municipality),
        top_services_affected: municipality.top_services_affected,
        color,
        summary: municipality.summary
      };
    })
    .filter((point): point is HeatmapDataPoint => point !== null); // Remove null entries
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
 * Get bounds for heatmap display (Ontario-focused)
 */
export function getOntarioBounds(): [[number, number], [number, number]] {
  // Ontario bounds: [west, south, east, north]
  return [[-95.2, 41.6], [-74.3, 56.9]];
}

/**
 * Get default map center for Ontario
 */
export function getOntarioCenter(): [number, number] {
  return [-81.0, 46.0]; // Geographic center of Ontario
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
