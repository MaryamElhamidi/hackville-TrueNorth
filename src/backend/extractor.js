import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import pdfParse from 'pdf-parse';
import { URL } from 'url';

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

function isPdfUrl(url) {
  return url.toLowerCase().endsWith('.pdf');
}

function extractHtmlText(html) {
  const $ = cheerio.load(html);

  // Remove navigation, headers, footers, scripts, styles
  $('nav, header, footer, script, style, .navigation, .nav, .header, .footer, .menu, .sidebar').remove();

  // Try to find main content areas
  let content = '';

  // Look for main content selectors
  const mainSelectors = [
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    'article',
    '.article',
    '.post-content',
    '.entry-content'
  ];

  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length > 0 && element.text().trim().length > 100) {
      content = element.text();
      break;
    }
  }

  // Fallback to body if no main content found
  if (!content) {
    content = $('body').text();
  }

  // Extract title
  const title = $('title').text().trim() ||
                $('h1').first().text().trim() ||
                'Untitled Document';

  // Normalize whitespace
  content = content.replace(/\s+/g, ' ').trim();

  return { title, content };
}

async function extractPdfText(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'ClineBot/1.0'
      }
    });

    const data = await pdfParse(Buffer.from(response.data));

    // Extract title from URL or use filename
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'document.pdf';
    const title = filename.replace('.pdf', '').replace(/-/g, ' ').replace(/_/g, ' ');

    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      content: data.text
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

function isQualityContent(text, url) {
  // Check minimum length
  if (text.length < 300) {
    return false;
  }

  // Check for mostly navigation/boilerplate
  const words = text.split(/\s+/);
  const commonWords = ['home', 'about', 'contact', 'menu', 'navigation', 'footer', 'copyright'];
  const commonWordCount = words.filter(word =>
    commonWords.includes(word.toLowerCase())
  ).length;

  if (commonWordCount > words.length * 0.3) {
    return false;
  }

  return true;
}

export async function extractDocuments(city, discoveredUrls) {
  const { name: municipality, website: baseUrl } = city;
  const documents = [];

  if (!discoveredUrls || discoveredUrls.length === 0) {
    return documents;
  }

  try {
    // Check robots.txt once for the domain
    const robotsUrl = `${baseUrl.replace(/\/$/, '')}/robots.txt`;
    let robots;
    try {
      const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
      robots = robotsParser(robotsUrl, robotsResponse.data);
    } catch (e) {
      robots = null;
    }

    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5;

    for (const urlObj of discoveredUrls) {
      const { url } = urlObj;

      // Check robots.txt
      if (robots && !robots.isAllowed(url, 'ClineBot/1.0')) {
        console.warn(`Skipping ${url}: blocked by robots.txt`);
        continue;
      }

      try {
        let title = '';
        let rawText = '';
        let contentType = '';

        if (isPdfUrl(url)) {
          contentType = 'pdf';
          const result = await extractPdfText(url);
          title = result.title;
          rawText = result.content;
        } else {
          contentType = 'html';
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'ClineBot/1.0'
            }
          });

          const result = extractHtmlText(response.data);
          title = result.title;
          rawText = result.content;
        }

        // Quality filtering
        if (!isQualityContent(rawText, url)) {
          console.warn(`Skipping ${url}: low quality content`);
          consecutiveFailures++;
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log('Too many consecutive failures, stopping extraction.');
            break;
          }
          continue;
        }

        // Reset failure counter on success
        consecutiveFailures = 0;

        const document = {
          municipality,
          source_url: url,
          content_type: contentType,
          title,
          date_detected: new Date().toISOString().split('T')[0],
          raw_text: rawText
        };

        documents.push(document);

        // Flag large documents for chunking
        if (rawText.length > 50000) {
          console.log(`Large document detected: ${title} (${rawText.length} chars) - will need chunking in Step 4`);
        }

      } catch (error) {
        console.warn(`Failed to extract from ${url}:`, error.message);
        consecutiveFailures++;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log('Too many consecutive failures, stopping extraction.');
          break;
        }
      }

      // Rate limiting: 1 second between requests
      await delay(1000);
    }

  } catch (error) {
    console.error('Error in extractDocuments:', error);
  }

  return documents;
}
