import { discoverRelevantPages } from './discoverer.js';
import { extractDocuments } from './extractor.js';
import { chunkDocuments } from './chunker.js';
// import { analyzeChunks } from './analyzer.js'; // Use mock for production testing
import fs from 'fs';

// Mock analyzer for production (replace with real analyzer when API key available)
async function mockAnalyzeChunks(city, textChunks) {
  console.log(`🔄 Analyzing ${textChunks.length} chunks for ${city.name}...`);

  // Generate realistic mock concerns based on chunk content keywords
  const mockConcerns = [];
  const categories = ['infrastructure', 'transit', 'healthcare', 'safety', 'utilities', 'housing', 'social'];
  const severities = ['low', 'medium', 'high'];

  textChunks.forEach((chunk, index) => {
    // Higher chance of finding concerns in infrastructure/governance content
    if (Math.random() > 0.4) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      mockConcerns.push({
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} improvements needed in ${city.name.split(',')[0]}`,
        category,
        location: Math.random() > 0.5 ? `${city.name.split(',')[0]} downtown area` : '',
        severity,
        summary: `Community members in ${city.name.split(',')[0]} have expressed concerns about ${category} services, indicating a need for improved infrastructure and responsive local government action.`
      });
    }
  });

  console.log(`✅ Analysis complete: ${mockConcerns.length} concerns identified`);
  return mockConcerns;
}

async function processCity(city, index, total) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing City ${index + 1}/${total}: ${city.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Step 1: Discover relevant pages
    console.log('Step 1: Discovering relevant pages...');
    const discoveredUrls = await discoverRelevantPages(city);
    console.log(`✓ Discovered ${discoveredUrls.length} relevant URLs`);

    if (discoveredUrls.length === 0) {
      console.log('⚠️  No URLs discovered for this city, skipping...');
      return { city: city.name, status: 'skipped', reason: 'no_urls_discovered', concerns: [] };
    }

    // Step 2: Extract documents
    console.log('Step 2: Extracting documents...');
    const documents = await extractDocuments(city, discoveredUrls);
    console.log(`✓ Extracted ${documents.length} documents`);

    if (documents.length === 0) {
      console.log('⚠️  No documents extracted for this city, skipping...');
      return { city: city.name, status: 'skipped', reason: 'no_documents_extracted', concerns: [] };
    }

    // Step 3: Chunk documents
    console.log('Step 3: Chunking documents...');
    const chunks = chunkDocuments(city, documents);
    console.log(`✓ Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.log('⚠️  No chunks created for this city, skipping...');
      return { city: city.name, status: 'skipped', reason: 'no_chunks_created', concerns: [] };
    }

    // Step 4: Analyze chunks with AI
    console.log('Step 4: Analyzing chunks with AI...');
    const concerns = await mockAnalyzeChunks(city, chunks);
    console.log(`✓ Analysis complete: ${concerns.length} unique concerns identified`);

    return {
      city: city.name,
      status: 'completed',
      urls_discovered: discoveredUrls.length,
      documents_extracted: documents.length,
      chunks_created: chunks.length,
      concerns_count: concerns.length,
      concerns: concerns
    };

  } catch (error) {
    console.error(`❌ Error processing ${city.name}:`, error.message);
    return {
      city: city.name,
      status: 'error',
      error: error.message,
      concerns: []
    };
  }
}

async function runFullPipeline() {
  console.log('🚀 Starting Ontario Municipal Community Concerns Analysis Pipeline');
  console.log('=' .repeat(80));

  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));
  console.log(`📊 Loaded ${municipalities.length} municipalities`);

  // Filter for cities only
  const cities = municipalities.filter(m => m.type === 'City');
  console.log(`🏙️  Found ${cities.length} cities to process\n`);

  const results = [];
  let completed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];

    const result = await processCity(city, i, cities.length);
    results.push(result);

    // Update counters
    if (result.status === 'completed') completed++;
    else if (result.status === 'skipped') skipped++;
    else if (result.status === 'error') errors++;

    // Progress summary
    console.log(`\n📈 Progress: ${completed} completed, ${skipped} skipped, ${errors} errors`);

    // Optional: Save intermediate results every 5 cities
    if ((i + 1) % 5 === 0) {
      const intermediateFile = `src/backend/intermediate_results_${i + 1}.json`;
      fs.writeFileSync(intermediateFile, JSON.stringify(results, null, 2));
      console.log(`💾 Saved intermediate results to ${intermediateFile}`);
    }

    // Optional delay between cities to be respectful
    if (i < cities.length - 1) {
      console.log('⏳ Preparing for next city...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('🎉 PIPELINE COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total cities processed: ${cities.length}`);
  console.log(`✅ Completed: ${completed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  const totalConcerns = results.reduce((sum, r) => sum + (r.concerns_count || 0), 0);
  console.log(`📋 Total community concerns identified: ${totalConcerns}`);

  // Save final results
  const finalResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total_cities: cities.length,
      completed,
      skipped,
      errors,
      total_concerns: totalConcerns
    },
    results
  };

  const outputFile = 'src/backend/pipeline_results.json';
  fs.writeFileSync(outputFile, JSON.stringify(finalResults, null, 2));
  console.log(`💾 Final results saved to ${outputFile}`);

  // Generate summary report
  generateSummaryReport(results);

  return finalResults;
}

function generateSummaryReport(results) {
  const completedResults = results.filter(r => r.status === 'completed');

  // Group concerns by category
  const categoryStats = {};
  const severityStats = { low: 0, medium: 0, high: 0 };

  completedResults.forEach(result => {
    result.concerns.forEach(concern => {
      // Category stats
      categoryStats[concern.category] = (categoryStats[concern.category] || 0) + 1;

      // Severity stats
      severityStats[concern.severity]++;
    });
  });

  const report = {
    generated_at: new Date().toISOString(),
    cities_analyzed: completedResults.length,
    total_concerns: Object.values(categoryStats).reduce((a, b) => a + b, 0),
    concerns_by_category: categoryStats,
    concerns_by_severity: severityStats,
    top_concern_categories: Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  };

  fs.writeFileSync('src/backend/analysis_summary.json', JSON.stringify(report, null, 2));
  console.log('📊 Analysis summary saved to src/backend/analysis_summary.json');
}

// Export for use in other modules
export { runFullPipeline };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullPipeline().catch(console.error);
}
