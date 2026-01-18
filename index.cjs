const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const keywords = ['council', 'city-hall', 'government', 'meetings', 'agendas', 'minutes', 'committees', 'consultation', 'have-your-say'];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifySourceType(url, title) {
  const text = (url + ' ' + title).toLowerCase();
  if (text.includes('minutes')) return 'minutes';
  if (text.includes('agenda')) return 'agenda';
  if (text.includes('council')) return 'council';
  if (text.includes('committee')) return 'committee';
  if (text.includes('consultation') || text.includes('have-your-say')) return 'consultation';
  return 'other';
}

function extractDate(text) {
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{2}\/\d{2}\/\d{4})\b/,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(\d{4})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].includes('/')) {
        const [m, d, y] = match[1].split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (match[1].includes('-')) {
        return match[1];
      } else {
        const months = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
          'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        const month = months[match[1].toLowerCase()];
        if (month) {
          return `${match[3]}-${month}-${match[2].padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
}

async function checkRobots(baseUrl) {
  try {
    const parsedUrl = new URL(baseUrl);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const response = await axios.get(robotsUrl, { timeout: 5000 });
    return robotsParser(robotsUrl, response.data);
  } catch (e) {
    return { isAllowed: () => true };
  }
}

async function extractFromHtml(html, url) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside').remove();
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const date = extractDate(text + ' ' + title);
  return { title, text, date };
}

async function extractFromPdf(buffer, url) {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const data = await pdfParse(buffer);
    const text = data.text.replace(/\s+/g, ' ').trim();
    const title = data.info?.Title || url.split('/').pop() || 'PDF Document';
    const date = extractDate(text + ' ' + title);
    return { title, text, date };
  } catch (e) {
    return { title: 'PDF Document', text: '', date: null };
  } finally {
    console.warn = originalWarn;
  }
}

async function crawlMunicipality(municipality, robots) {
  const baseUrl = municipality.base_url;
  if (!baseUrl) return [];

  console.log(`Starting crawl for ${municipality.municipality_name}`);

  try {
    // Simple approach: just get the homepage and extract some text
    const response = await axios.get(baseUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Extract main content
    $('script, style, nav, header, footer, aside').remove();
    const title = $('title').text().trim() || 'Homepage';
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    if (text.length > 200) {
      return [{
        municipality: municipality.municipality_name,
        source_type: 'homepage',
        title: title.substring(0, 200),
        date: null,
        source_url: baseUrl,
        text: text.substring(0, 2000)
      }];
    }
  } catch (e) {
    console.log(`Failed to crawl ${municipality.municipality_name}: ${e.message}`);
  }

  return [];
}

async function main() {
  const municipalities = JSON.parse(fs.readFileSync('ontario_municipalities.json', 'utf8'));
  const cities = municipalities.filter(m => m.municipality_type.toLowerCase() === 'city');
  console.log(`Found ${cities.length} cities to process`);

  const allDocuments = [];
  const concurrency = 2; // Reduced to 2 for stability

  for (let i = 0; i < cities.length; i += concurrency) {
    const batch = cities.slice(i, i + concurrency);
    console.log(`Processing batch: ${batch.map(m => m.municipality_name).join(', ')}`);

    const promises = batch.map(async (municipality) => {
      try {
        const robots = await checkRobots(municipality.base_url);
        const docs = await crawlMunicipality(municipality, robots);
        console.log(`Found ${docs.length} documents for ${municipality.municipality_name}`);
        return docs;
      } catch (e) {
        console.log(`Failed to process ${municipality.municipality_name}: ${e.message}`);
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach(docs => allDocuments.push(...docs));

    console.log(`Batch completed. Total documents so far: ${allDocuments.length}`);
  }

  fs.writeFileSync('municipal_raw_documents.json', JSON.stringify(allDocuments, null, 2));
  console.log(`Crawling completed. Total documents: ${allDocuments.length}`);
}

main();
