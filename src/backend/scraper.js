const axios = require('axios');
const cheerio = require('cheerio');
const csv = require('csv-parser');
const fs = require('fs');

const csvUrl = 'https://files.ontario.ca/mmah-list-of-ontario-municipalities-en-utf8-2022-10-05.csv';

async function scrapeMunicipalities() {
  try {
    const response = await axios.get(csvUrl, { responseType: 'stream' });
    const municipalities = [];

    response.data
      .pipe(csv())
      .on('data', (row) => {
        const municipalityHtml = row['\ufeffMunicipality'];

        // Parse the HTML
        const $ = cheerio.load(municipalityHtml);
        const link = $('a');
        const href = link.attr('href');
        const nameWithType = link.text().trim();

        // Extract name and type
        const match = nameWithType.match(/^(.+?),\s*(.+?)\s*$/);
        let name = nameWithType;
        let type = '';
        if (match) {
          name = match[1].trim();
          type = match[2].toLowerCase().replace(/\bof\b/, '').trim(); // Remove "of" and lowercase
        }

        // Normalize URL
        let website = null;
        if (href) {
          let url = href.trim();
          // Ensure HTTPS
          if (url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
          }
          // Remove query parameters and fragments
          url = url.split('?')[0].split('#')[0];
          website = url;
        }

        municipalities.push({
          municipality_name: name,
          municipality_type: type,
          base_url: website
        });
      })
      .on('end', () => {
        // Save to JSON
        fs.writeFileSync('ontario_municipalities.json', JSON.stringify(municipalities, null, 2));
        console.log('Scraping completed. Data saved to ontario_municipalities.json');
      });
  } catch (error) {
    console.error('Error scraping data:', error);
  }
}

scrapeMunicipalities();
