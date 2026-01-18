import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function createPrompt(cityName, chunkText) {
  return `You are analyzing municipal government text from the City of ${cityName}.

TASKS:
1. Extract any community concerns, complaints, or unmet needs.
2. For each concern, determine its severity:
   - Low: minor inconvenience or affects few residents
   - Medium: moderate impact, multiple residents, or recurring problem
   - High: major impact, affects large groups, critical service or safety
3. Ignore procedural or administrative content.
4. Return ONLY valid JSON using the schema below.

Text:
${chunkText}

Required JSON Schema:
{
  "concerns": [
    {
      "description": "Short, clear description of the concern",
      "category": "housing | transit | healthcare | infrastructure | safety | utilities | social | other",
      "location": "Specific neighbourhood, ward, or area if mentioned, otherwise empty string",
      "severity": "low | medium | high",
			"summary": a concise 2-4 sentence summary of the concern 
    }
  ]
}

If no concerns are found, return: { "concerns": [] }`;
}

async function analyzeChunk(cityName, chunk) {
  try {
    const prompt = createPrompt(cityName, chunk.text);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`No JSON found in response for chunk ${chunk.chunk_index}/${chunk.total_chunks}`);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.concerns || !Array.isArray(parsed.concerns)) {
      console.warn(`Invalid JSON structure for chunk ${chunk.chunk_index}/${chunk.total_chunks}`);
      return [];
    }

    // Validate and clean each concern
    const validConcerns = parsed.concerns.filter(concern => {
      return concern.description &&
             concern.category &&
             ['housing', 'transit', 'healthcare', 'infrastructure', 'safety', 'utilities', 'social', 'other'].includes(concern.category) &&
             ['low', 'medium', 'high'].includes(concern.severity);
    });

    return validConcerns;

  } catch (error) {
    console.error(`Error analyzing chunk ${chunk.chunk_index}/${chunk.total_chunks}:`, error.message);
    return [];
  }
}

function deduplicateConcerns(concerns) {
  const seen = new Set();
  const unique = [];

  for (const concern of concerns) {
    // Create a key based on description and location
    const key = `${concern.description.toLowerCase().trim()}_${concern.location.toLowerCase().trim()}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(concern);
    } else {
      // If duplicate, keep the one with higher severity
      const existingIndex = unique.findIndex(c =>
        c.description.toLowerCase().trim() === concern.description.toLowerCase().trim() &&
        c.location.toLowerCase().trim() === concern.location.toLowerCase().trim()
      );

      if (existingIndex !== -1) {
        const severityOrder = { low: 1, medium: 2, high: 3 };
        if (severityOrder[concern.severity] > severityOrder[unique[existingIndex].severity]) {
          unique[existingIndex] = concern;
        }
      }
    }
  }

  return unique;
}

export async function analyzeChunks(city, textChunks) {
  const { name: municipality } = city;
  const allConcerns = [];

  console.log(`Analyzing ${textChunks.length} chunks for ${municipality}...`);

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    console.log(`Processing chunk ${i + 1}/${textChunks.length}: ${chunk.title} (${chunk.text.length} chars)`);

    const concerns = await analyzeChunk(municipality, chunk);

    if (concerns.length > 0) {
      console.log(`Found ${concerns.length} concerns in chunk ${i + 1}`);
      allConcerns.push(...concerns);
    } else {
      console.log(`No concerns found in chunk ${i + 1}`);
    }

    // Small delay between API calls to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Deduplicate concerns
  const uniqueConcerns = deduplicateConcerns(allConcerns);

  console.log(`Total unique concerns for ${municipality}: ${uniqueConcerns.length}`);

  return uniqueConcerns;
}
