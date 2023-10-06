const express = require('express');
const Scrapper = require('./app');
const { searchValidator, jsonValidator } = require('./middlewares/searchvalidator');

const app = express();
const port = 3000;

app.use(express.json());

app.use(jsonValidator);

app.post('/search', searchValidator, async (req, res) => {
    const { searchText, stratPage, searchUpto } = req.body;
    try {
        const listingsArray = await Scrapper.start(searchText,stratPage,searchUpto);
        if (listingsArray.length > 0) {
            const responseObj = {
                data: listingsArray,
                status: 'success',
                count: listingsArray.length,
            };
            res.json(responseObj);
        } else {
            res.status(404).json({ error: 'No data found.' });
        }
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
