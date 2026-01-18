import { discoverRelevantPages } from './discoverer.js';
import { extractDocuments } from './extractor.js';
import fs from 'fs';

async function test() {
  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));

  // Find a city
  const city = municipalities.find(m => m.type === 'City');
  console.log('Testing with city:', city);

  // First, discover URLs
  console.log('Step 1: Discovering relevant pages...');
  const discoveredUrls = await discoverRelevantPages(city);
  console.log(`Discovered ${discoveredUrls.length} relevant URLs`);

  if (discoveredUrls.length === 0) {
    console.log('No URLs discovered, stopping test.');
    return;
  }

  // Limit to first 5 URLs for testing
  const testUrls = discoveredUrls.slice(0, 5);
  console.log(`Testing extraction with ${testUrls.length} URLs...`);

  // Extract documents
  console.log('Step 2: Extracting documents...');
  const documents = await extractDocuments(city, testUrls);

  console.log(`Extracted ${documents.length} documents:`);
  documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title} (${doc.content_type}) - ${doc.raw_text.length} chars`);
  });

  console.log('Test completed.');
}

test().catch(console.error);
