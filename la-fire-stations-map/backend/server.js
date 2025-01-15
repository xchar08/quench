// backend/server.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS to allow requests from your frontend
app.use(cors());

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Load environment variables
const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

// In-memory cache for shelters data
let cachedShelters = null;
let lastScrapeTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

app.get('/api/shelters', async (req, res) => {
  try {
    const currentTime = Date.now();
    if (cachedShelters && (currentTime - lastScrapeTime) < CACHE_DURATION) {
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

    // Set a common user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    await page.setJavaScriptEnabled(true);

    await page.goto('https://maps.redcross.org/website/maps/arc_shelters.html', {
      waitUntil: 'networkidle2',
    });

    // Scrape shelter data
    const shelters = await page.$$eval('table tbody tr', (rows) => {
      return rows.map((row) => {
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
      }).filter(shelter => shelter.latitude !== null && shelter.longitude !== null); // Exclude entries without coordinates
    });

    await browser.close();

    console.log('Scraped Shelters (Before Geocoding):', shelters); // Debugging log

    // Geocode shelters to get latitude and longitude if missing or invalid
    const geocodedShelters = await Promise.all(
      shelters.map(async (shelter) => {
        const { streetAddress, city, state, zip } = shelter;
        const fullAddress = `${streetAddress}, ${city}, ${state} ${zip}`;
        try {
          const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              address: fullAddress,
              key: GOOGLE_GEOCODING_API_KEY,
            },
          });

          if (
            geocodeResponse.data.status === 'OK' &&
            geocodeResponse.data.results.length > 0
          ) {
            const location = geocodeResponse.data.results[0].geometry.location;
            return {
              ...shelter,
              latitude: location.lat,
              longitude: location.lng,
            };
          } else {
            console.warn(`Geocoding failed for address: ${fullAddress}`);
            return {
              ...shelter,
              latitude: null,
              longitude: null,
            };
          }
        } catch (error) {
          console.error(`Error geocoding address: ${fullAddress}`, error);
          return {
            ...shelter,
            latitude: null,
            longitude: null,
          };
        }
      })
    );

    // Filter out shelters without valid coordinates
    const validShelters = geocodedShelters.filter(
      (shelter) => shelter.latitude !== null && shelter.longitude !== null
    );

    console.log('Geocoded Shelters:', validShelters); // Debugging log

    // Cache the scraped shelters
    cachedShelters = validShelters;
    lastScrapeTime = currentTime;

    res.json(validShelters);
  } catch (error) {
    console.error('Error scraping shelters:', error);
    res.status(500).json({ error: 'Failed to scrape shelters data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});