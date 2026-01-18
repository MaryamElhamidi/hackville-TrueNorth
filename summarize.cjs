require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mergeIssues(issues) {
  const merged = [];
  const seen = new Set();

  for (const issue of issues) {
    const key = `${issue.service || 'unknown'}-${issue.location || 'unknown'}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Merge summaries
    const similar = issues.filter(i => (i.service || 'unknown') === (issue.service || 'unknown') && (i.location || 'unknown') === (i.location || 'unknown'));
    const combinedSummary = similar.map(i => i.summary).join(' ').substring(0, 1000); // Limit
    merged.push({
      ...issue,
      summary: combinedSummary
    });
  }
  return merged;
}

async function generateSummary(municipality, mergedIssues) {
  const issuesText = mergedIssues.map(i => `- ${i.issue}: ${i.summary}`).join('\n');
  const prompt = `Summarize community concerns for ${municipality} in 2-3 paragraphs. Highlight frequent service gaps, locations mentioned, and affected groups. Be concise and factual.

Issues:
${issuesText}

Summary:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (e) {
    // Fallback manual summary
    const services = [...new Set(mergedIssues.map(i => i.service).filter(Boolean))];
    const locations = [...new Set(mergedIssues.map(i => i.location).filter(Boolean))];
    return `${municipality} has concerns in services: ${services.join(', ')}. Locations: ${locations.join(', ')}.`;
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Please set GEMINI_API_KEY in .env');
    process.exit(1);
  }

  const concerns = JSON.parse(fs.readFileSync('detected_community_concerns.json', 'utf8'));
  console.log(`Loaded ${concerns.length} concerns`);

  const byMunicipality = {};
  for (const concern of concerns) {
    if (!byMunicipality[concern.municipality]) {
      byMunicipality[concern.municipality] = [];
    }
    byMunicipality[concern.municipality].push(concern);
  }

  const summaries = [];

  for (const [municipality, issues] of Object.entries(byMunicipality)) {
    console.log(`Processing ${municipality} with ${issues.length} issues`);
    const merged = mergeIssues(issues);
    const summary = await generateSummary(municipality, merged);
    await delay(1000);

    const topServices = [...new Set(merged.map(i => i.service).filter(Boolean))];
    const locations = [...new Set(merged.map(i => i.location).filter(Boolean))];

    summaries.push({
      municipality,
      summary,
      issues_count: merged.length,
      top_services_affected: topServices,
      locations_mentioned: locations
    });
  }

  fs.writeFileSync('municipality_summaries.json', JSON.stringify(summaries, null, 2));
  console.log('Summarization completed. Data saved to municipality_summaries.json');
}

main();
