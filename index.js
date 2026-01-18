import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import pdfParse from 'pdf-parse';
import Bottleneck from 'bottleneck';
import { URL } from 'url';

const limiter = new Bottleneck({ minTime: 1000 }); // 1 request per second

const keywords = ['council', 'city-hall', 'government', 'meetings', 'agendas', 'minutes', 'committees', 'consultation', 'have-your-say'];

function isRelevant(url, text) {
    const lowerUrl = url.toLowerCase();
    const lowerText = text.toLowerCase();
    return keywords.some(k => lowerUrl.includes(k) || lowerText.includes(k));
}

function determineSourceType(url, text) {
    const lowerUrl = url.toLowerCase();
    const lowerText = text.toLowerCase();
    for (const k of keywords) {
        if (lowerUrl.includes(k) || lowerText.includes(k)) {
            if (k === 'council') return 'council';
            if (k === 'minutes') return 'minutes';
            if (k === 'agendas') return 'agenda';
            if (k === 'committees') return 'committee';
            if (k === 'consultation' || k === 'have-your-say') return 'consultation';
            return 'other';
        }
    }
    return 'other';
}

function extractDate(text) {
    // Simple regex for YYYY-MM-DD or MM/DD/YYYY etc.
    const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})\b/;
    const match = text.match(dateRegex);
    return match ? match[1] : null;
}

async function fetchRobotsTxt(baseUrl) {
    try {
        const robotsUrl = new URL('/robots.txt', baseUrl).href;
        const response = await limiter.schedule(() => axios.get(robotsUrl, { timeout: 10000 }));
        return robotsParser(robotsUrl, response.data);
    } catch (e) {
        console.log(`No robots.txt for ${baseUrl}: ${e.message}`);
        return null; // No robots.txt or error
    }
}

function isAllowed(robots, url) {
    if (!robots) return true;
    return robots.isAllowed(url, 'crawler');
}

async function scrapePage(url, isPdf = false) {
    try {
        const response = await limiter.schedule(() => axios.get(url, {
            responseType: isPdf ? 'arraybuffer' : 'text',
            timeout: 15000,
            headers: {
                'User-Agent': 'OntarioMunicipalCrawler/1.0'
            }
        }));
        if (isPdf) {
            const data = await pdfParse(response.data);
            return {
                title: 'PDF Document',
                text: data.text,
                date: extractDate(data.text)
            };
        } else {
            const $ = cheerio.load(response.data);
            const title = $('title').text().trim() || 'No Title';
            // Extract main text, remove scripts, styles, nav, header, footer
            $('script, style, nav, header, footer, aside, .sidebar, .menu').remove();
            const text = $('body').text().replace(/\s+/g, ' ').trim();
            const date = extractDate(text);
            return { title, text, date };
        }
    } catch (e) {
        console.error(`Error scraping ${url}: ${e.message}`);
        return null;
    }
}

async function crawl(baseUrl, municipality, robots, visited = new Set(), depth = 0, maxDepth = 3) {
    if (depth > maxDepth || visited.has(baseUrl)) return [];
    visited.add(baseUrl);

    const results = [];

    try {
        if (!isAllowed(robots, baseUrl)) {
            console.log(`Disallowed by robots: ${baseUrl}`);
            return results;
        }

        const isPdf = baseUrl.toLowerCase().endsWith('.pdf');
        const content = await scrapePage(baseUrl, isPdf);
        if (content && content.text.length > 100) { // Only if substantial content
            results.push({
                municipality,
                source_type: determineSourceType(baseUrl, content.title + ' ' + content.text),
                title: content.title,
                date: content.date,
                source_url: baseUrl,
                text: content.text
            });
        }

        if (!isPdf && depth < maxDepth) {
            // Find links
            try {
                const response = await limiter.schedule(() => axios.get(baseUrl, { timeout: 15000 }));
                const $ = cheerio.load(response.data);
                const links = [];
                $('a').each((i, el) => {
                    const href = $(el).attr('href');
                    const text = $(el).text().trim();
                    if (href && isRelevant(href, text)) {
                        try {
                            const fullUrl = new URL(href, baseUrl).href;
                            if (fullUrl.startsWith(baseUrl) && !visited.has(fullUrl) && !fullUrl.includes('#')) { // Same domain, no anchors
                                links.push(fullUrl);
                            }
                        } catch (e) {
                            // Invalid URL, skip
                        }
                    }
                });
                for (const link of links) {
                    try {
                        const subResults = await crawl(link, municipality, robots, visited, depth + 1, maxDepth);
                        results.push(...subResults);
                    } catch (e) {
                        console.error(`Error crawling ${link}: ${e.message}`);
                    }
                }
            } catch (e) {
                console.error(`Error fetching links from ${baseUrl}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(`Error in crawl for ${baseUrl}: ${e.message}`);
    }

    return results;
}

async function main() {
    try {
        console.log('Loading municipalities...');
        const municipalities = JSON.parse(fs.readFileSync('ontario_municipalities.json', 'utf8'));
        console.log(`Found ${municipalities.length} total municipalities.`);

        const cities = municipalities.filter(m => m.municipality_type.toLowerCase() === 'city').slice(0, 3); // Limit to 3 for demo
        console.log(`Filtered to ${cities.length} cities to process (limited for demo).`);

        const allResults = [];

        for (let i = 0; i < cities.length; i += 1) {
            const mun = cities[i];
            console.log(`Processing ${i + 1}/${cities.length}: ${mun.municipality_name} (${mun.municipality_type})`);
            try {
                const robots = await fetchRobotsTxt(mun.base_url);
                const results = await crawl(mun.base_url, mun.municipality_name, robots);
                allResults.push(...results);
                console.log(`Found ${results.length} documents for ${mun.municipality_name}`);
            } catch (e) {
                console.error(`Failed to process ${mun.municipality_name}: ${e.message}`);
            }
        }

        fs.writeFileSync('municipal_raw_documents.json', JSON.stringify(allResults, null, 2));
        console.log(`Crawling completed. Total documents: ${allResults.length}. Data saved to municipal_raw_documents.json`);
    } catch (e) {
        console.error(`Main error: ${e.message}`);
    }
}

main();
