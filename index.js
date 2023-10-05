const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const userAgent = require('user-agents');
const Scrapper = require('./app');

puppeteer.use(StealthPlugin());

const app = express();
const port = 3000;

app.use(express.json());

app.post('/search', async (req, res) => {
    const searchText = req.body.searchText;

    try {
        const listingsArray = await Scrapper.start(searchText);
        res.json(listingsArray);
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
