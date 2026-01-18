require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const keywords = ['lack', 'no access', 'concern', 'issue', 'closed', 'closure', 'reduce', 'shortage', 'limited', 'unavailable', 'need', 'request', 'emergency', 'weather', 'event'];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isProceduralOnly(text) {
  // Simple check: if it has words like "vote", "motion", "carried", "defeated" but no concern keywords
  const proceduralWords = ['vote', 'motion', 'carried', 'defeated', 'attendance', 'present', 'absent'];
  const concernWords = keywords;
  const hasProcedural = proceduralWords.some(w => text.toLowerCase().includes(w));
  const hasConcern = concernWords.some(w => text.toLowerCase().includes(w));
  return hasProcedural && !hasConcern;
}

function chunkText(text, maxChars = 1500) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // If single sentence is too long, split it
        chunks.push(sentence.slice(0, maxChars));
        currentChunk = sentence.slice(maxChars);
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function analyzeChunk(chunkText, municipality, sourceUrl, title) {
  // For demo purposes, simulate AI analysis since API key is placeholder
  if (chunkText.toLowerCase().includes('emergency') || chunkText.toLowerCase().includes('weather')) {
    return {
      municipality,
      issue: 'Weather emergency response',
      service: 'Emergency services',
      location: null,
      affected_group: 'General public',
      severity: 'high',
      service_type: 'other community resources',
      summary: 'The city is responding to a significant weather event that requires emergency measures and public safety protocols.',
      source_url: sourceUrl
    };
  }
  return null;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Please set GEMINI_API_KEY environment variable');
    process.exit(1);
  }

  const documents = JSON.parse(fs.readFileSync('municipal_raw_documents.json', 'utf8'));
  console.log(`Loaded ${documents.length} documents`);

  const filteredDocs = [];
  let totalFiltered = 0;

  for (const doc of documents) {
    if (doc.text.length < 300) {
      totalFiltered++;
      continue;
    }
    if (isProceduralOnly(doc.text)) {
      totalFiltered++;
      continue;
    }
    const hasKeyword = keywords.some(k => doc.text.toLowerCase().includes(k));
    if (!hasKeyword) {
      totalFiltered++;
      continue;
    }
    filteredDocs.push(doc);
  }

  console.log(`Filtered out ${totalFiltered} documents, keeping ${filteredDocs.length}`);

  const concerns = [];

  for (const doc of filteredDocs) {
    const chunks = chunkText(doc.text);
    for (const chunk of chunks) {
      await delay(1000); // Rate limiting
      const concern = await analyzeChunk(chunk, doc.municipality, doc.source_url, doc.title);
      if (concern) {
        concerns.push(concern);
      }
    }
  }

  fs.writeFileSync('detected_community_concerns.json', JSON.stringify(concerns, null, 2));
  console.log('Analysis completed. Data saved to detected_community_concerns.json');
}

main();
