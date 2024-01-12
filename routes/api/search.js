const express = require('express');
const router = express.Router();

require('dotenv').config();
const { response, query } = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const langImport = require('@langchain/openai')
const langPromptImport = require('@langchain/core/prompts');
const langParserImport = require('@langchain/core/output_parsers')
const langLoaderImport = require('langchain/document_loaders/web/cheerio');
const langSplitterImport = require('langchain/text_splitter');
const langVectorImport = require('langchain/vectorstores/memory');
const langCombineImport = require('langchain/chains/combine_documents');
const langRetrieverImport = require('langchain/chains/retrieval')
const langTransformerImport = require('@langchain/community/document_transformers/html_to_text');
const langDocumentImport = require('@langchain/core/documents');

// import { ChatOpenAI } from '@langchain/openai';

const chatModel = new langImport.ChatOpenAI({
  openAIApiKey: process.env.GPT_KEY,
});

const { OpenAI } = require("openai");

const openai = new OpenAI({
    organization: process.env.GPT_ORG,
    apiKey: process.env.GPT_KEY,
});


router.get('/test', (req, res) => res.send("search route testing"));

router.get('/getArticles', async (req, res) => {

    // const authorizationHeader = req.headers.authorization || null;
  
    // if (!authorizationHeader) {
    //   console.error('Access token is missing.');
    //   res.status(401).json({ error: 'Unauthorized' });
    //   return;
    // }

    // console.log(authorizationHeader);

    // const config = {
    //     headers: {
    //         'Authorization': authorizationHeader
    //     }
    // };

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
            // config
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

        const allLinks = resultData.items.map((item) => item.link);

        const splitter = new langSplitterImport.RecursiveCharacterTextSplitter();

        // console.log(allLinks);

        let batchText = "";

        for (const url of allLinks) {
          try {
            const urlResponse = await axios.get(url);
        
            const $ = cheerio.load(urlResponse.data);
        
            const text = extractVisibleText($);
        
            // console.log(text);
        
            // Concatenate the text to batchText
            batchText += text + '\n'; // Adjust the delimiter or formatting as needed
          } catch (error) {
            console.error(`Error fetching or processing data for URL ${url}:`, error.message);
            // Handle the error accordingly, for example, log it or continue with the next URL.
          }
        }

        // console.log(batchText);


        // const output = splitter.createDocuments([batchText]);
        // const splitDocs = await splitter.splitDocuments(output);

        const docOutput = await splitter.splitDocuments([
          new langDocumentImport.Document({ pageContent: batchText }),
        ]);

        const prompt = langPromptImport.ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

        <context>
        {context}
        </context>

        Question: {input}`);

        const documentChain = await langCombineImport.createStuffDocumentsChain({
          llm: chatModel,
          prompt,
        });

        const embeddings = new langImport.OpenAIEmbeddings({
          openAIApiKey: process.env.GPT_KEY,
        });
    
        const vectorstore = await langVectorImport.MemoryVectorStore.fromDocuments(
          docOutput,
          embeddings,
        )
    
        const retriever = vectorstore.asRetriever();
    
        const retrievalChain = await langRetrieverImport.createRetrievalChain({
          combineDocsChain: documentChain,
          retriever,
        })

        // const inputString = `You are given multiple news articles with varying bias. Give me accurate facts stripping the bias only about the` + query

        // console.log(inputString)
    
        const test = await retrievalChain.invoke({
          input : `You are given multiple news articles with varying bias. Give me accurate facts stripping the bias only about the ${q}.`
          // input: `Give me the facts presented by this news article about the SVB Crash. There might be some text that does not pertain to the article. Strip bias, only give facts.`,
        });

        // console.log(test.answer);

        // console.log(resultData.items)

        const returnData = {
          articles: resultData,
          facts: test.answer,
        }

        res.status(200).send(returnData);
    } catch (err) {
        console.error(err);
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

  
  router.get('/lang', async (req, res) => {

    // console.log(req.body.query);

    const prompt = langPromptImport.ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}`);

    const documentChain = await langCombineImport.createStuffDocumentsChain({
      llm: chatModel,
      prompt,
    })

    const response = await axios.get("https://www.cnn.com/2023/03/14/tech/viral-bank-run/index.html");

    const $ = cheerio.load(response.data);

    const text = extractVisibleText($);


    const splitter = new langSplitterImport.RecursiveCharacterTextSplitter();

    const output = await splitter.createDocuments([text]);

    // console.log(output);

    const splitDocs = await splitter.splitDocuments(output);

    // console.log(splitDocs);

    const embeddings = new langImport.OpenAIEmbeddings({
      openAIApiKey: process.env.GPT_KEY,
    });

    const vectorstore = await langVectorImport.MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings,
    )

    const retriever = vectorstore.asRetriever();

    const retrievalChain = await langRetrieverImport.createRetrievalChain({
      combineDocsChain: documentChain,
      retriever,
    })

    const test = await retrievalChain.invoke({
      input: "Give me the facts presented by this news article about the SVB Crash. There might be some text that does not pertain to the article. Strip bias, only give facts. Return this in JSON format",
    });

    res.send(test.answer);
  });
  

module.exports = router;