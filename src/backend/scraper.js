import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as csvParse } from 'csv-parse';

async function scrapeOntarioMunicipalities() {
  try {
    const csvUrl = 'https://files.ontario.ca/mmah-list-of-ontario-municipalities-en-utf8-2022-10-05.csv';
    const response = await axios.get(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const municipalities = [];

    // Parse CSV
    const parser = csvParse(response.data, {
      columns: true,
      skip_empty_lines: true
    });

    for await (const record of parser) {
      const municipalityHtml = record.Municipality;
      const status = record['Municipal status'];
      const area = record['Geographic area '];

      if (municipalityHtml) {
        // Parse the HTML to extract name and website
        const $ = cheerio.load(municipalityHtml);
        const a = $('a');
        const name = a.attr('title') || a.text().trim();
        const website = a.attr('href');

        if (name && website) {
          // Extract type from name
          let type = 'Municipality'; // default
          const lowerName = name.toLowerCase();
          if (lowerName.includes('city of')) type = 'City';
          else if (lowerName.includes('town of')) type = 'Town';
          else if (lowerName.includes('township of')) type = 'Township';
          else if (lowerName.includes('village of')) type = 'Village';
          else if (lowerName.includes('regional municipality') || lowerName.includes('region')) type = 'Region';
          else if (lowerName.includes('county of')) type = 'County';

          // Normalize URL
          let normalizedWebsite = website;
          if (normalizedWebsite.startsWith('//')) normalizedWebsite = `https:${normalizedWebsite}`;
          else if (!normalizedWebsite.startsWith('http')) normalizedWebsite = `https://${normalizedWebsite}`;

          // Remove tracking params
          try {
            const urlObj = new URL(normalizedWebsite);
            urlObj.search = ''; // remove query params
            normalizedWebsite = urlObj.toString();
          } catch (e) {
            // Invalid URL, skip
            continue;
          }

          municipalities.push({
            name: name.trim(),
            type,
            website: normalizedWebsite
          });
        }
      }
    }

    // Sort by name
    municipalities.sort((a, b) => a.name.localeCompare(b.name));

    // Save to JSON
    const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ontario_municipalities.json');
    fs.writeFileSync(outputPath, JSON.stringify(municipalities, null, 2));
    console.log(`Scraped ${municipalities.length} municipalities and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error scraping:', error);
  }
}

scrapeOntarioMunicipalities();
