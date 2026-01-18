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

  const visited = new Set();
  const toVisit = [baseUrl];
  const relevantUrls = new Set();
  const startTime = Date.now();
  const maxTime = 3 * 60 * 1000; // 3 minutes per municipality

  while (toVisit.length > 0 && Date.now() - startTime < maxTime) {
    const currentUrl = toVisit.shift();
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      await delay(1500); // Rate limiting
      const response = await axios.get(currentUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      // Find relevant links
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
          const absoluteUrl = new URL(href, currentUrl).href;
          const parsedUrl = new URL(absoluteUrl);

          // Stay within same domain
          if (parsedUrl.host !== new URL(baseUrl).host) return;

          const linkText = $(elem).text().toLowerCase();
          const path = parsedUrl.pathname.toLowerCase();

          // Check if relevant
          if (keywords.some(k => linkText.includes(k) || path.includes(k))) {
            relevantUrls.add(absoluteUrl);
          }

          // Add to queue if not visited and within depth limit
          if (!visited.has(absoluteUrl) && parsedUrl.pathname.split('/').length - 1 <= 2) {
            toVisit.push(absoluteUrl);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });
    } catch (e) {
      // Skip failed requests
    }
  }

  console.log(`Found ${relevantUrls.size} relevant URLs for ${municipality.municipality_name}`);

  // Scrape relevant URLs
  const documents = [];
  for (const url of relevantUrls) {
    if (!robots.isAllowed(url)) continue;

    try {
      await delay(1500);
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });

      let title, text, date;
      if (url.toLowerCase().endsWith('.pdf')) {
        ({ title, text, date } = await extractFromPdf(response.data, url));
      } else {
        const html = response.data.toString('utf-8', 0, 100000); // Limit size
        ({ title, text, date } = await extractFromHtml(html, url));
      }

      if (text.length > 100) { // Only keep if substantial content
        const sourceType = classifySourceType(url, title);
        documents.push({
          municipality: municipality.municipality_name,
          source_type: sourceType,
          title: title.substring(0, 200), // Limit title length
          date,
          source_url: url,
          text: text.substring(0, 5000) // Limit text length
        });
      }
    } catch (e) {
      // Skip failed extractions
    }
  }

  console.log(`Extracted ${documents.length} documents from ${municipality.municipality_name}`);
  return documents;
}

async function main() {
  const municipalities = JSON.parse(fs.readFileSync('ontario_municipalities.json', 'utf8'));
  const cities = municipalities.filter(m => m.municipality_type.toLowerCase() === 'city');
  console.log(`Found ${cities.length} cities to process`);

  const allDocuments = [];
  const concurrency = 2; // Reduced to 2 for stability

  // Test with just first city
  const testCity = cities[0];
  console.log(`Testing with ${testCity.municipality_name}`);

  try {
    const robots = await checkRobots(testCity.base_url);
    const docs = await crawlMunicipality(testCity, robots);
    allDocuments.push(...docs);
    console.log(`Test completed. Found ${docs.length} documents`);
  } catch (e) {
    console.log(`Test failed: ${e.message}`);
  }

  // Uncomment below for full run
  /*
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
  */

  fs.writeFileSync('municipal_raw_documents.json', JSON.stringify(allDocuments, null, 2));
  console.log(`Crawling completed. Total documents: ${allDocuments.length}`);
}

main();
