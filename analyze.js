import 'dotenv/config';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const filterKeywords = ['lack', 'no access', 'concern', 'issue', 'closed', 'closure', 'reduce', 'shortage', 'limited', 'unavailable', 'need', 'request'];

function isProcedural(text) {
    const lower = text.toLowerCase();
    return lower.includes('attendance') || lower.includes('voting results') || lower.includes('roll call');
}

function shouldKeep(doc) {
    if (doc.text.length < 300) return false;
    if (isProcedural(doc.text)) return false;
    const lower = doc.text.toLowerCase();
    return filterKeywords.some(k => lower.includes(k));
}

function chunkText(text, maxLength = 1500) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                chunks.push(sentence.substring(0, maxLength));
                currentChunk = sentence.substring(maxLength);
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

async function analyzeChunk(chunk, municipality, sourceUrl, title) {
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
${chunk}`;

    const models = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log(`Trying model: ${modelName}`);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            const json = JSON.parse(text);
            console.log(`Success with model: ${modelName}`);
            if (json.is_concern === false) return null;
            return {
                municipality,
                issue: json.issue || null,
                service: json.service || null,
                location: json.location || null,
                affected_group: json.affected_group || null,
                severity: json.severity || 'medium',
                summary: json.summary || '',
                source_url: sourceUrl
            };
        } catch (e) {
            console.error(`Error with model ${modelName}: ${e.message}`);
        }
    }
    console.error(`Failed all models for chunk`);
    return null;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        console.log('Loading documents...');
        const documents = JSON.parse(fs.readFileSync('municipal_raw_documents.json', 'utf8'));
        console.log(`Loaded ${documents.length} documents.`);

        const filtered = documents.filter(shouldKeep);
        console.log(`Filtered to ${filtered.length} relevant documents.`);

        const concerns = [];

        for (const doc of filtered) {
            console.log(`Processing ${doc.municipality}: ${doc.title}`);
            const chunks = chunkText(doc.text);
            for (const chunk of chunks) {
                const concern = await analyzeChunk(chunk, doc.municipality, doc.source_url, doc.title);
                if (concern) {
                    concerns.push(concern);
                }
                await delay(1000); // Rate limit
            }
        }

        fs.writeFileSync('detected_community_concerns.json', JSON.stringify(concerns, null, 2));
        console.log(`Analysis completed. Found ${concerns.length} concerns. Saved to detected_community_concerns.json`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

main();
