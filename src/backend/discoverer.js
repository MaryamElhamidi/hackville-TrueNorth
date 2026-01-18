import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { URL } from 'url';

const RELEVANT_KEYWORDS = [
  'council',
  'city-hall',
  'government',
  'meetings',
  'agendas',
  'minutes',
  'committees',
  'consultation',
  'have-your-say'
];

const SKIP_KEYWORDS = [
  'tourism',
  'recreation',
  'business',
  'events',
  'directory',
  'services'
];

function getCategory(url, anchorText) {
  const text = `${url} ${anchorText}`.toLowerCase();
  if (text.includes('council')) return 'council';
  if (text.includes('minutes')) return 'minutes';
  if (text.includes('agenda')) return 'agenda';
  if (text.includes('committee')) return 'committee';
  if (text.includes('consultation') || text.includes('have-your-say')) return 'consultation';
  return 'other';
}

function isRelevant(url, anchorText) {
  const text = `${url} ${anchorText}`.toLowerCase();
  // Check if contains relevant keywords
  const hasRelevant = RELEVANT_KEYWORDS.some(keyword => text.includes(keyword));
  // Check if contains skip keywords
  const hasSkip = SKIP_KEYWORDS.some(keyword => text.includes(keyword));
  return hasRelevant && !hasSkip;
}

function normalizeUrl(baseUrl, href) {
  try {
    if (href.startsWith('http')) {
      return href;
    }
    const base = new URL(baseUrl);
    const url = new URL(href, base);
    return url.href;
  } catch (e) {
    return null;
  }
}

function isSameDomain(baseUrl, url) {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url);
    return base.hostname === target.hostname;
  } catch (e) {
    return false;
  }
}

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

export async function discoverRelevantPages(city) {
  const { name: municipality, website: baseUrl } = city;

  if (!baseUrl) {
    return [];
  }

  return new Promise((resolve) => {
    let results = [];
    let visited = new Set();
    let robots = null;
    let timeoutReached = false;

    const progressInterval = setInterval(() => {
      console.log(`Discovery in progress... Visited ${visited.size} pages, found ${results.length} relevant URLs so far.`);
    }, 60 * 1000); // Every 1 minute

    const timeout = setTimeout(() => {
      timeoutReached = true;
      clearInterval(progressInterval);
      console.log('Discovery timeout reached (3 minutes). Returning current results.');
      // Remove duplicates
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex(t => t.url === item.url)
      );
      resolve(uniqueResults);
    }, 3 * 60 * 1000); // 3 minutes

    async function crawl() {
      try {
        // Check robots.txt
        const robotsUrl = `${baseUrl.replace(/\/$/, '')}/robots.txt`;
        try {
          const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
          robots = robotsParser(robotsUrl, robotsResponse.data);
        } catch (e) {
          // If robots.txt not found, assume allowed
          robots = null;
        }

        const queue = [{ url: baseUrl, depth: 0 }];

        while (queue.length > 0 && !timeoutReached) {
          const { url, depth } = queue.shift();

          if (visited.has(url) || depth > 3) {
            continue;
          }

          visited.add(url);

          // Check robots.txt
          if (robots && !robots.isAllowed(url, 'ClineBot/1.0')) {
            continue;
          }

          try {
            const response = await axios.get(url, {
              timeout: 10000,
              headers: {
                'User-Agent': 'ClineBot/1.0'
              }
            });

            const $ = cheerio.load(response.data);

            // Find all links
            $('a[href]').each((i, elem) => {
              const href = $(elem).attr('href');
              const anchorText = $(elem).text().trim();

              if (href) {
                const normalizedUrl = normalizeUrl(url, href);
                if (normalizedUrl && isSameDomain(baseUrl, normalizedUrl)) {
                  // Check if relevant
                  if (isRelevant(normalizedUrl, anchorText)) {
                    const category = getCategory(normalizedUrl, anchorText);
                    results.push({
                      municipality,
                      category,
                      url: normalizedUrl
                    });
                  }

                  // Add to queue if not visited and within depth
                  if (!visited.has(normalizedUrl) && depth < 3) {
                    queue.push({ url: normalizedUrl, depth: depth + 1 });
                  }
                }
              }
            });

          } catch (error) {
            // Skip broken pages
            console.warn(`Failed to fetch ${url}:`, error.message);
          }

          // Rate limiting: 1 second between requests
          await delay(1000);
        }

        if (!timeoutReached) {
          // Remove duplicates
          const uniqueResults = results.filter((item, index, self) =>
            index === self.findIndex(t => t.url === item.url)
          );

          clearTimeout(timeout);
          clearInterval(progressInterval);
          console.log('Discovery completed successfully.');
          resolve(uniqueResults);
        }

      } catch (error) {
        console.error('Error in discoverRelevantPages:', error);
        clearTimeout(timeout);
        clearInterval(progressInterval);
        resolve([]);
      }
    }

    crawl();
  });
}
