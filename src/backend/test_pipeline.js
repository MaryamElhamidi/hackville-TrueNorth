import { discoverRelevantPages } from './discoverer.js';
import { extractDocuments } from './extractor.js';
import { chunkDocuments } from './chunker.js';
// import { analyzeChunks } from './analyzer.js'; // Use mock for testing
import fs from 'fs';

// Mock analyzer for testing
async function mockAnalyzeChunks(city, textChunks) {
  console.log(`Mock analyzing ${textChunks.length} chunks for ${city.name}...`);

  // Generate mock concerns based on chunk content
  const mockConcerns = [];
  const categories = ['infrastructure', 'transit', 'healthcare', 'safety', 'utilities', 'housing', 'social'];
  const severities = ['low', 'medium', 'high'];

  textChunks.forEach((chunk, index) => {
    if (Math.random() > 0.3) { // 70% chance of finding concerns
      const category = categories[Math.floor(Math.random() * categories.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      mockConcerns.push({
        description: `Community concern related to ${category} in ${city.name.split(',')[0]}`,
        category,
        location: Math.random() > 0.5 ? `${city.name.split(',')[0]} downtown` : '',
        severity
      });
    }
  });

  console.log(`Mock analysis complete: found ${mockConcerns.length} concerns`);
  return mockConcerns;
}

async function testFullPipeline(limit = 3) {
  console.log('🧪 Testing Ontario Municipal Community Concerns Analysis Pipeline');
  console.log('=' .repeat(80));
  console.log(`Processing first ${limit} cities only for testing\n`);

  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));
  console.log(`📊 Loaded ${municipalities.length} municipalities`);

  // Filter for cities only and limit
  const cities = municipalities.filter(m => m.type === 'City').slice(0, limit);
  console.log(`🏙️  Processing ${cities.length} cities (limited for testing)\n`);

  const results = [];
  let completed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing City ${i + 1}/${cities.length}: ${city.name}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Step 1: Discover relevant pages
      console.log('Step 1: Discovering relevant pages...');
      const discoveredUrls = await discoverRelevantPages(city);
      console.log(`✓ Discovered ${discoveredUrls.length} relevant URLs`);

      if (discoveredUrls.length === 0) {
        console.log('⚠️  No URLs discovered, skipping...');
        results.push({ city: city.name, status: 'skipped', reason: 'no_urls', concerns: [] });
        skipped++;
        continue;
      }

      // Step 2: Extract documents (limit URLs for testing)
      const testUrls = discoveredUrls.slice(0, 3); // Limit for testing
      console.log(`Step 2: Extracting documents from ${testUrls.length} URLs...`);
      const documents = await extractDocuments(city, testUrls);
      console.log(`✓ Extracted ${documents.length} documents`);

      if (documents.length === 0) {
        console.log('⚠️  No documents extracted, skipping...');
        results.push({ city: city.name, status: 'skipped', reason: 'no_documents', concerns: [] });
        skipped++;
        continue;
      }

      // Step 3: Chunk documents
      console.log('Step 3: Chunking documents...');
      const chunks = chunkDocuments(city, documents);
      console.log(`✓ Created ${chunks.length} chunks`);

      if (chunks.length === 0) {
        console.log('⚠️  No chunks created, skipping...');
        results.push({ city: city.name, status: 'skipped', reason: 'no_chunks', concerns: [] });
        skipped++;
        continue;
      }

      // Step 4: Analyze chunks (using mock)
      console.log('Step 4: Analyzing chunks with AI (mock)...');
      const concerns = await mockAnalyzeChunks(city, chunks);
      console.log(`✓ Analysis complete: ${concerns.length} concerns identified`);

      const result = {
        city: city.name,
        status: 'completed',
        urls_discovered: discoveredUrls.length,
        documents_extracted: documents.length,
        chunks_created: chunks.length,
        concerns_count: concerns.length,
        concerns: concerns
      };

      results.push(result);
      completed++;

    } catch (error) {
      console.error(`❌ Error processing ${city.name}:`, error.message);
      results.push({
        city: city.name,
        status: 'error',
        error: error.message,
        concerns: []
      });
      errors++;
    }

    console.log(`📈 Progress: ${completed} completed, ${skipped} skipped, ${errors} errors`);

    // Delay between cities
    if (i < cities.length - 1) {
      console.log('⏳ Preparing for next city...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('🎉 TEST PIPELINE COMPLETE');
  console.log('='.repeat(80));
  console.log(`Cities processed: ${cities.length}`);
  console.log(`✅ Completed: ${completed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  const totalConcerns = results.reduce((sum, r) => sum + (r.concerns_count || 0), 0);
  console.log(`📋 Total concerns identified: ${totalConcerns}`);

  // Save test results
  const testResults = {
    timestamp: new Date().toISOString(),
    test_type: 'limited_pipeline_test',
    cities_processed: cities.length,
    summary: { completed, skipped, errors, total_concerns: totalConcerns },
    results
  };

  const outputFile = 'src/backend/test_pipeline_results.json';
  fs.writeFileSync(outputFile, JSON.stringify(testResults, null, 2));
  console.log(`💾 Test results saved to ${outputFile}`);

  return testResults;
}

// Run test with first 3 cities
testFullPipeline(3).catch(console.error);
