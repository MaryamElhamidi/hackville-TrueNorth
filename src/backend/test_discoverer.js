import { discoverRelevantPages } from './discoverer.js';
import fs from 'fs';

async function test() {
  // Load municipalities
  const municipalities = JSON.parse(fs.readFileSync('src/backend/ontario_municipalities.json', 'utf8'));

  // Find a city
  const city = municipalities.find(m => m.type === 'City');
  console.log('Testing with city:', city);

  const results = await discoverRelevantPages(city);
  console.log('Results:', results);
}

test().catch(console.error);
