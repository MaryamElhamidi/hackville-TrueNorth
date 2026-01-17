const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const keywords = ['council', 'city-hall', 'government', 'meetings', 'agendas', 'minutes', 'committees', 'consultation', 'have-your-say'];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifySourceType(urlStr, title) {
  const text = (urlStr + ' ' + title).toLowerCase();
  if (text.includes('council')) return 'council';
  if (text.includes('minutes')) return 'minutes';
  if (text.includes('agenda')) return 'agenda';
  if (text.includes('committee')) return 'committee';
  if (text.includes('consultation') || text.includes('have-your-say')) return 'consultation';
  return 'other';
}

function extractDate(text) {
  // Simple regex for YYYY-MM-DD or MM/DD/YYYY or Month DD, YYYY
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{2}\/\d{2}\/\d{4})\b/,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i
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
        // Month name, convert to YYYY-MM-DD
        const months = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
          'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        const monthMatch = match[1].match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
        if (monthMatch) {
          const month = months[monthMatch[1].toLowerCase()];
          const day = monthMatch[2].padStart(2, '0');
          const year = monthMatch[3];
          return `${year}-${month}-${day}`;
        }
      }
    }
  }
  return null;
}

async function checkRobots(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const response = await axios.get(robotsUrl);
    return robotsParser(robotsUrl, response.data);
  } catch (e) {
    // If no robots.txt, assume allowed
    return { isAllowed: () => true };
  }
}

async function extractFromHtml(html, urlStr) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  const title = $('title').text().trim() || 'No title';
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const date = extractDate(text + ' ' + title);
  return { title, text, date };
}

async function extractFromPdf(buffer, urlStr) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.replace(/\s+/g, ' ').trim();
    const parsed = new URL(urlStr);
    const title = data.info?.Title || parsed.pathname.split('/').pop() || 'PDF Document';
    const date = extractDate(text + ' ' + title);
    return { title, text, date };
  } catch (e) {
    return { title: 'PDF Error', text: '', date: null };
  }
}

async function crawlMunicipality(municipality, robots) {
  const baseUrl = municipality.base_url;
  if (!baseUrl) return [];

  const visited = new Set();
  const queue = [{ url: baseUrl, depth: 0 }];
  const relevantUrls = [];

  while (queue.length > 0) {
    const { url: currentUrl, depth } = queue.shift();
    if (visited.has(currentUrl) || depth > 3) continue;
    visited.add(currentUrl);

    if (!robots.isAllowed(currentUrl)) continue;

    try {
      await delay(1000); // Rate limiting
      const response = await axios.get(currentUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      $('a').each((i, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;
        let absoluteUrl;
        try {
          absoluteUrl = new URL(href, currentUrl).href;
        } catch (e) {
          return;
        }
        const parsed = new URL(absoluteUrl);
        const baseParsed = new URL(baseUrl);
        if (parsed.host !== baseParsed.host) return; // Same domain
        const text = $(elem).text().toLowerCase();
        const pathLower = parsed.pathname.toLowerCase();
        if (keywords.some(k => text.includes(k) || pathLower.includes(k))) {
          relevantUrls.push(absoluteUrl);
        }
        if (depth < 3 && !visited.has(absoluteUrl)) {
          queue.push({ url: absoluteUrl, depth: depth + 1 });
        }
      });
    } catch (e) {
      // Skip errors
    }
  }

  // Now scrape relevant URLs
  const documents = [];
  for (const relUrl of relevantUrls) {
    if (!robots.isAllowed(relUrl)) continue;
    try {
      await delay(1000);
      const response = await axios.get(relUrl, { responseType: 'arraybuffer', timeout: 10000 });
      let title, text, date;
      if (relUrl.toLowerCase().endsWith('.pdf')) {
        ({ title, text, date } = await extractFromPdf(response.data, relUrl));
      } else {
        const html = response.data.toString();
        ({ title, text, date } = await extractFromHtml(html, relUrl));
      }
      const sourceType = classifySourceType(relUrl, title);
      documents.push({
        municipality: municipality.municipality_name,
        source_type: sourceType,
        title,
        date,
        source_url: relUrl,
        text
      });
    } catch (e) {
      // Skip
    }
  }
  return documents;
}

async function main() {
  const municipalities = JSON.parse(fs.readFileSync('ontario_municipalities.json', 'utf8'));
  const cities = municipalities.filter(m => m.municipality_type.toLowerCase() === 'city');
  console.log(`Found ${cities.length} cities to crawl`);

  const allDocuments = [];

  for (const municipality of cities) {
    console.log(`Crawling ${municipality.municipality_name}`);
    try {
      const robots = await checkRobots(municipality.base_url);
      const docs = await crawlMunicipality(municipality, robots);
      allDocuments.push(...docs);
    } catch (e) {
      console.log(`Skipped ${municipality.municipality_name}: ${e.message}`);
    }
  }

  fs.writeFileSync('municipal_raw_documents.json', JSON.stringify(allDocuments, null, 2));
  console.log('Crawling completed. Data saved to municipal_raw_documents.json');
}

main();
