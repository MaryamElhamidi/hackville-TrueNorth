// Test script to validate heatmap coordinate fixes
import { transformMunicipalityToHeatmapData } from './src/lib/dashboard/heatmap.js';
import { loadMunicipalitySummaries } from './src/lib/dashboard/filtering.js';

console.log('🧪 Testing Heatmap Coordinate Validation...\n');

try {
  // Load municipality data
  const municipalities = loadMunicipalitySummaries();
  console.log(`📊 Loaded ${municipalities.length} municipalities`);

  // Transform to heatmap data
  const heatmapData = transformMunicipalityToHeatmapData(municipalities, null);
  console.log(`✅ Transformed ${heatmapData.length} municipalities to heatmap data\n`);

  // Validate coordinates
  let validCoords = 0;
  let invalidCoords = 0;
  let fallbackCoords = 0;

  heatmapData.forEach(point => {
    const isValidLat = point.latitude >= 41.6 && point.latitude <= 56.9;
    const isValidLng = point.longitude >= -95.2 && point.longitude <= -74.3;

    if (isValidLat && isValidLng) {
      validCoords += 1;
    } else {
      invalidCoords += 1;
      console.log(`❌ Invalid coordinates for ${point.municipality}: lat=${point.latitude}, lng=${point.longitude}`);
    }

    // Check if coordinates are fallback (likely to be near center)
    const isFallback = Math.abs(point.latitude - 46.0) < 0.1 && Math.abs(point.longitude - (-81.0)) < 0.1;
    if (isFallback) {
      fallbackCoords += 1;
    }
  });

  console.log('\n📈 Validation Results:');
  console.log(`✅ Valid coordinates: ${validCoords}`);
  console.log(`❌ Invalid coordinates: ${invalidCoords}`);
  console.log(`🔄 Fallback coordinates used: ${fallbackCoords}`);

  // Test coordinate distribution
  const latitudes = heatmapData.map(p => p.latitude);
  const longitudes = heatmapData.map(p => p.longitude);

  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lngMin = Math.min(...longitudes);
  const lngMax = Math.max(...longitudes);

  console.log('\n🗺️  Coordinate Distribution:');
  console.log(`Latitude range: ${latMin.toFixed(4)} to ${latMax.toFixed(4)}`);
  console.log(`Longitude range: ${lngMin.toFixed(4)} to ${lngMax.toFixed(4)}`);

  // Test severity distribution
  const severityCounts = heatmapData.reduce((acc, point) => {
    acc[point.severity] = (acc[point.severity] || 0) + 1;
    return acc;
  }, {});

  console.log('\n🎯 Severity Distribution:');
  Object.entries(severityCounts).forEach(([severity, count]) => {
    console.log(`${severity}: ${count} municipalities`);
  });

  console.log('\n🎉 Heatmap validation completed successfully!');

} catch (error) {
  console.error('❌ Error during validation:', error);
}
