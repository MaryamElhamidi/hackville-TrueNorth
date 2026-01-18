import { discoverRelevantPages } from './discoverer.js';
import { extractDocuments } from './extractor.js';
import { chunkDocuments } from './chunker.js';
import fs from 'fs';

async function test() {
  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));

  // Find a city
  const city = municipalities.find(m => m.type === 'City');
  console.log('Testing chunking pipeline with city:', city);

  // Step 1: Discover URLs
  console.log('Step 1: Discovering relevant pages...');
  const discoveredUrls = await discoverRelevantPages(city);
  console.log(`Discovered ${discoveredUrls.length} relevant URLs`);

  if (discoveredUrls.length === 0) {
    console.log('No URLs discovered, stopping test.');
    return;
  }

  // Step 2: Extract documents (limit to first 3 for testing)
  const testUrls = discoveredUrls.slice(0, 3);
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

  console.log(`Created ${chunks.length} chunks:`);
  chunks.forEach((chunk, i) => {
    console.log(`${i + 1}. "${chunk.title}" - Chunk ${chunk.chunk_index}/${chunk.total_chunks} (${chunk.text.length} chars)`);
    console.log(`   Preview: ${chunk.text.substring(0, 100)}...`);
    console.log('');
  });

  console.log('Chunking test completed.');
}

test().catch(console.error);
