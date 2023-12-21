const express = require('express');
const router = express.Router();

require('dotenv').config();
const { response } = require('express');
const axios = require('axios');
const google = require('googleapis');


router.get('/test', (req, res) => res.send("search route testing"));

router.get('/getArticles', async (req, res, next) => {
    try {
        console.log("Endpoint being called");

        const { q } = req.query;
        console.log(q);

        const response = await axios.get('https://customsearch.googleapis.com/customsearch/v1', {
            params: {
                key: process.env.CUSTOM_SEARCH_KEY,
                cx: process.env.ENGINE_KEY,
                q,
                start: 0,
                num: 10,
            },
        });

        const { data } = response;
        const { queries, items, searchInformation } = data;

        const page = (queries.request || [])[0] || {};
        const previousPage = (queries.previousPage || [])[0] || {};
        const nextPage = (queries.nextPage || [])[0] || {};

        const resultData = {
            q,
            totalResults: page.totalResults,
            count: page.count,
            startIndex: page.startIndex,
            nextPage: nextPage.startIndex,
            previousPage: previousPage.startIndex,
            time: searchInformation.searchTime,
            items: items.map(o => ({
                link: o.link,
                title: o.title,
                snippet: o.snippet,
                img: (((o.pagemap || {}).cse_image || [])[0] || {}).src,
            })),
        };

        console.log(resultData);

        res.status(200).send(resultData);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || 'Internal Server Error');
    }
});

module.exports = router;