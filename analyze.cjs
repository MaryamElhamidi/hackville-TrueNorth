require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const keywords = ['lack', 'no access', 'concern', 'issue', 'closed', 'closure', 'reduce', 'shortage', 'limited', 'unavailable', 'need', 'request'];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
  const prompt = `You are analyzing municipal government documents from Ontario cities.

TASKS:
1. Determine whether the text describes a community concern, service gap, or unmet local need.
2. If yes, extract:
   - Issue description
   - Service or resource affected
   - Location or neighbourhood (if mentioned)
   - Who is affected (if stated)
   - Severity (low, medium, high)
3. Write a concise 2–4 sentence summary.

If no community concern is present, return:
{ "is_concern": false }

Return JSON only. Do not include explanations.

TEXT:
${chunkText}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    if (parsed.is_concern) {
      return {
        municipality,
        issue: parsed.issue || null,
        service: parsed.service || null,
        location: parsed.location || null,
        affected_group: parsed.affected_group || null,
        severity: parsed.severity || 'medium',
        summary: parsed.summary || '',
        source_url: sourceUrl
      };
    }
  } catch (e) {
    console.log(`Error analyzing chunk: ${e.message}`);
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
