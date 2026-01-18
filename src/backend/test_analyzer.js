import { discoverRelevantPages } from './discoverer.js';
import { extractDocuments } from './extractor.js';
import { chunkDocuments } from './chunker.js';
// import { analyzeChunks } from './analyzer.js'; // Commented out until API key is available
import fs from 'fs';

// Mock analyzer for testing without API key
async function mockAnalyzeChunks(city, textChunks) {
  console.log(`Mock analyzing ${textChunks.length} chunks for ${city.name}...`);

  // Return some mock concerns for testing
  const mockConcerns = [
    {
      description: "Road infrastructure improvements needed in downtown area",
      category: "infrastructure",
      location: "Downtown Barrie",
      severity: "medium"
    },
    {
      description: "Traffic congestion affecting multiple neighborhoods",
      category: "transit",
      location: "Various neighborhoods",
      severity: "high"
    },
    {
      description: "Sidewalk maintenance issues reported by residents",
      category: "safety",
      location: "Residential areas",
      severity: "low"
    }
  ];

  console.log(`Mock analysis complete: found ${mockConcerns.length} concerns`);
  return mockConcerns;
}

async function test() {
  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));

  // Find a city
  const city = municipalities.find(m => m.type === 'City');
  console.log('Testing AI analysis pipeline with city:', city);

  // Step 1: Discover URLs
  console.log('Step 1: Discovering relevant pages...');
  const discoveredUrls = await discoverRelevantPages(city);
  console.log(`Discovered ${discoveredUrls.length} relevant URLs`);

  if (discoveredUrls.length === 0) {
    console.log('No URLs discovered, stopping test.');
    return;
  }

  // Step 2: Extract documents (limit to first 2 for testing)
  const testUrls = discoveredUrls.slice(0, 2);
  console.log(`Step 2: Extracting documents from ${testUrls.length} URLs...`);
  const documents = await extractDocuments(city, testUrls);
  console.log(`Extracted ${documents.length} documents`);

  if (documents.length === 0) {
    console.log('No documents extracted, stopping test.');
    return;
  }

  // Step 3: Chunk documents
  console.log('Step 3: Chunking documents...');
  const chunks = chunkDocuments(city, documents);
  console.log(`Created ${chunks.length} chunks`);

  if (chunks.length === 0) {
    console.log('No chunks created, stopping test.');
    return;
  }

  // Step 4: Analyze chunks (using mock for now)
  console.log('Step 4: Analyzing chunks with AI...');
  const concerns = await mockAnalyzeChunks(city, chunks.slice(0, 2)); // Limit for testing

  console.log(`\nAnalysis Results for ${city.name}:`);
  console.log('=====================================');
  concerns.forEach((concern, i) => {
    console.log(`${i + 1}. ${concern.description}`);
    console.log(`   Category: ${concern.category}`);
    console.log(`   Location: ${concern.location || 'Not specified'}`);
    console.log(`   Severity: ${concern.severity.toUpperCase()}`);
    console.log('');
  });

  console.log(`Total concerns identified: ${concerns.length}`);
  console.log('AI analysis test completed (using mock data).');
}

test().catch(console.error);
