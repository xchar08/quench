// backend/server.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Enable CORS & JSON body parsing
app.use(cors());
app.use(express.json());

// Puppeteer stealth
puppeteer.use(StealthPlugin());

// ENV vars
const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;
const GRAPH_HOPPER_API_KEY =
  process.env.GRAPH_HOPPER_API_KEY || process.env.VITE_GRAPH_HOPPER_API_KEY; // fallback if needed

// In-memory cache for shelters
let cachedShelters = null;
let lastScrapeTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * ---------------
 * RED CROSS SHELTERS
 * ---------------
 * Scrapes shelters from maps.redcross.org, geocodes them,
 * caches the result for 1 hour, returns JSON.
 */
app.get('/api/shelters', async (req, res) => {
  try {
    const currentTime = Date.now();
    if (cachedShelters && currentTime - lastScrapeTime < CACHE_DURATION) {
      return res.json(cachedShelters);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/91.0.4472.124 Safari/537.36'
    );

    await page.setJavaScriptEnabled(true);

    // Scrape from Red Cross
    await page.goto('https://maps.redcross.org/website/maps/arc_shelters.html', {
      waitUntil: 'networkidle2',
    });

    const shelters = await page.$$eval('table tbody tr', (rows) => {
      return rows
        .map((row) => {
          const columns = row.querySelectorAll('td');
          const name = columns[0]?.innerText.trim() || 'N/A';
          const streetAddress = columns[1]?.innerText.trim() || 'N/A';
          const city = columns[2]?.innerText.trim() || 'N/A';
          const state = columns[3]?.innerText.trim() || 'N/A';
          const zip = columns[4]?.innerText.trim() || 'N/A';
          const latitude = parseFloat(columns[5]?.innerText.trim()) || null;
          const longitude = parseFloat(columns[6]?.innerText.trim()) || null;

          return {
            name,
            streetAddress,
            city,
            state,
            zip,
            latitude,
            longitude,
          };
        })
        .filter((s) => s.latitude !== null && s.longitude !== null);
    });

    await browser.close();
    console.log('Scraped Shelters (Before Geocoding):', shelters);

    // Optionally geocode addresses (usually not needed if table has lat/long)
    const geocodedShelters = await Promise.all(
      shelters.map(async (sh) => {
        const { streetAddress, city, state, zip } = sh;
        const fullAddress = `${streetAddress}, ${city}, ${state} ${zip}`;
        try {
          const geoResp = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            {
              params: { address: fullAddress, key: GOOGLE_GEOCODING_API_KEY },
            }
          );
          if (geoResp.data.status === 'OK' && geoResp.data.results.length > 0) {
            const loc = geoResp.data.results[0].geometry.location;
            return { ...sh, latitude: loc.lat, longitude: loc.lng };
          } else {
            return { ...sh, latitude: null, longitude: null };
          }
        } catch (error) {
          console.error(`Error geocoding address: ${fullAddress}`, error);
          return { ...sh, latitude: null, longitude: null };
        }
      })
    );
    const validShelters = geocodedShelters.filter(
      (s) => s.latitude !== null && s.longitude !== null
    );

    cachedShelters = validShelters;
    lastScrapeTime = currentTime;
    console.log('Geocoded Shelters:', validShelters);

    res.json(validShelters);
  } catch (error) {
    console.error('Error scraping shelters:', error);
    res.status(500).json({ error: 'Failed to scrape shelters data' });
  }
});

/**
 * ---------------
 * GRAPHHOPPER PROXY
 * ---------------
 * Forwards POST requests from React to GraphHopper, bypassing CORS.
 */
app.post('/api/graphhopper-route', async (req, res) => {
  try {
    if (!GRAPH_HOPPER_API_KEY) {
      return res
        .status(500)
        .json({ error: 'Missing GraphHopper API key in .env.' });
    }

    const ghUrl = `https://graphhopper.com/api/1/route?key=${GRAPH_HOPPER_API_KEY}`;
    // Forward the request body
    const ghResp = await axios.post(ghUrl, req.body, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Return data to client with CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.json(ghResp.data);
  } catch (error) {
    console.error('GraphHopper Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ---------------
 * NEBIUS PROXY
 * ---------------
 * Forwards POST requests to Nebius API, bypassing CORS restrictions.
 */
app.post('/api/nebius-proxy', async (req, res) => {
  try {
    const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
    if (!NEBIUS_API_KEY) {
      return res.status(500).json({ error: 'Missing Nebius API key in .env.' });
    }

    const nebiusUrl = 'https://api.studio.nebius.ai/v1/chat/completions';

    const nebiusResp = await axios.post(nebiusUrl, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEBIUS_API_KEY}`,
      },
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.json(nebiusResp.data);
  } catch (error) {
    console.error('Nebius Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: Do NOT listen on a port here in a serverless environment
// Export the Express app instead
module.exports = app;
