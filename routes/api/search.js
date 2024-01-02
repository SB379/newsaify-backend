const express = require('express');
const router = express.Router();

require('dotenv').config();
const { response } = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
// const google = require('googleapis');

const { Configuration, OpenAIApi, OpenAI } = require("openai");

const openai = new OpenAI({
    organization: process.env.GPT_ORG,
    apiKey: process.env.GPT_KEY,
});

// const configuration = new Configuration({
//     organization: process.env.GPT_ORG,
//     apiKey: process.env.GPT_KEY,
//   });

// const openai = new OpenAIApi(configuration);

router.get('/test', (req, res) => res.send("search route testing"));

// router.get('/getArticles', async (req, res, next) => {

//     // const authorizationHeader = req.headers.authorization || null;
  
//     // if (!authorizationHeader) {
//     //   console.error('Access token is missing.');
//     //   res.status(401).json({ error: 'Unauthorized' });
//     //   return;
//     // }

//     // console.log(authorizationHeader);

//     // const config = {
//     //     headers: {
//     //         'Authorization': authorizationHeader
//     //     }
//     // };

//     try {

//         const { q } = req.query;

//         const response = await axios.get('https://customsearch.googleapis.com/customsearch/v1', {
//             params: {
//                 key: process.env.CUSTOM_SEARCH_KEY,
//                 cx: process.env.ENGINE_KEY,
//                 q,
//                 start: 0,
//                 num: 10,
//             },
//             // config
//         });

//         const { data } = response;
//         const { queries, items, searchInformation } = data;

//         const page = (queries.request || [])[0] || {};
//         const previousPage = (queries.previousPage || [])[0] || {};
//         const nextPage = (queries.nextPage || [])[0] || {};

//         const resultData = {
//             q,
//             totalResults: page.totalResults,
//             count: page.count,
//             startIndex: page.startIndex,
//             nextPage: nextPage.startIndex,
//             previousPage: previousPage.startIndex,
//             time: searchInformation.searchTime,
//             items: items.map(o => ({
//                 link: o.link,
//                 title: o.title,
//                 snippet: o.snippet,
//                 img: (((o.pagemap || {}).cse_image || [])[0] || {}).src,
//             })),
//         };

//         // console.log(resultData);

//         res.status(200).send(resultData);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send(err.message || 'Internal Server Error');
//     }
// });

router.get('/getArticles', async (req, res, next) => {
    try {
        const { q } = req.query;

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

        res.status(200).send(resultData);
    } catch (err) {
        console.error('Error:', err.message);

        // Print the error details in the data field
        if (err.response && err.response.data) {
            console.error('Error Data:', err.response.data);
        }

        res.status(500).send(err.message || 'Internal Server Error');
    }
});


router.get('/factCheck', async (req, res) => {

    // const authorizationHeader = req.headers.authorization || null;
  
    // if (!authorizationHeader) {
    //   console.error('Access token is missing.');
    //   res.status(401).json({ error: 'Unauthorized' });
    //   return;
    // }

    const { url } = req.query;
  
    try {
    
      // Make a request to the provided URL
      const response = await axios.get(url);
  
      // Load the HTML content into Cheerio
      const $ = cheerio.load(response.data);
  
      // Extract all visible text nodes
      const articleText = extractVisibleText($);
  
      // Log the article text to the console
    //   console.log('Article Text:', articleText);

    const completion = await openai.chat.completions.create({
        messages: [
            {
            role: "system",
            content: "You are an unbiased fact-checking news expert."
            },
            {
            role: "user",
            content: `Give me the facts presented by this news article as a JSON object in the format {"article": "", "facts":[]}. There might be some text that does not pertain to the article. Strip bias, only give facts. ${articleText}`,
            }
        ],
        model: "gpt-4-1106-preview",
        response_format: { type: "json_object"},
    })

      // Send the article text as the response
    //   console.log(completion.choices[0]);
      res.send(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });

  router.post('/factCheckBatch', async (req, res) => {

    console.log("Calling endpoint");

    try {
      const { urls } = req.body;
  
      // Validate that 'urls' is an array
      // This array validation is not working at the moment, but its also not triggered the 400 error
    //   if (!Array.isArray(urls)) {
    //     return res.status(400).json({ error: 'Invalid input. "urls" must be an array.' });
    //   }

      console.log("got down here")
  
    //   const factsByURL = await Promise.all(urls.map(async (url) => {
    //     try {
    //         console.log("Processing new URL");
    //       const facts = await processURL(url);
    //       return { url, facts };
    //     } catch (error) {
    //       return { url, error: 'Error processing URL.' };
    //     }
    //   }));
  
    //   console.log("aggregating facts");
    //   const aggregatedFacts = aggregateFacts(factsByURL);
    //   console.log("getting top facts");
    //   const topFacts = getTopFacts(aggregatedFacts, 5); // Adjust the number based on your preference
  
    //   res.json({ topFacts });
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });
  
  function extractVisibleText($, element = 'body') {
    // Extract text from all visible text nodes
    const visibleTextNodes = [];
    $(`${element} :not(script, style, iframe)`).contents().each(function () {
      if (this.nodeType === 3 && $(this).text().trim() !== '') {
        visibleTextNodes.push($(this).text().trim());
      }
    });
  
    // Join the text nodes into a single string
    const articleText = visibleTextNodes.join('\n');
  
    return articleText;
  }

  function getTopFacts(aggregatedFacts, count) {
    // Convert aggregated facts into an array of objects with 'fact' and 'count' properties
    const factsArray = Object.entries(aggregatedFacts).map(([fact, count]) => ({ fact, count }));
  
    // Sort the facts array based on the count in descending order
    factsArray.sort((a, b) => b.count - a.count);
  
    // Return the top N facts
    return factsArray.slice(0, count);
  }

  function aggregateFacts(factsByURL) {
    const aggregatedFacts = {};
  
    factsByURL.forEach(({ facts }) => {
      facts.forEach((fact) => {
        // Use a simple tally to count the occurrences of each fact
        aggregatedFacts[fact] = (aggregatedFacts[fact] || 0) + 1;
      });
    });
  
    return aggregatedFacts;
  }

  async function processURL(url) {
    try {
      // Make a request to the provided URL
      const response = await axios.get(url);
  
      // Load the HTML content into Cheerio
      const $ = cheerio.load(response.data);
  
      // Extract all visible text nodes
      const articleText = extractVisibleText($);
  
      // Use OpenAI GPT-4 to generate facts based on user input
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a fact-checking news expert."
          },
          {
            role: "user",
            content: `Give me the facts presented by this news article as a JSON object in the format {"article": "", "facts":[]}. There might be some text that does not pertain to the article. Strip bias, only give facts. ${articleText}`,
          }
        ],
        model: "gpt-4-1106-preview",
        response_format: { type: "json_object" },
      });
  
      // Return the generated facts
      return {
        url,
        facts: completion.choices[0].message.content,
      };
    } catch (error) {
      // Handle errors here
      console.error('Error processing URL:', error.message);
      throw error; // Rethrow the error to be caught in the calling function
    }
  }
  

module.exports = router;