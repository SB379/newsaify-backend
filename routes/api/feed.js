const express = require('express');
const router = express.Router();

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const langImport = require('@langchain/openai')
const langPromptImport = require('@langchain/core/prompts');
const langSplitterImport = require('langchain/text_splitter');
const langVectorImport = require('langchain/vectorstores/memory');
const langCombineImport = require('langchain/chains/combine_documents');
const langRetrieverImport = require('langchain/chains/retrieval')
const langDocumentImport = require('@langchain/core/documents');


const chatModel = new langImport.ChatOpenAI({
  openAIApiKey: process.env.GPT_KEY,
});

const { OpenAI } = require("openai");
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({
    organization: process.env.GPT_ORG,
    apiKey: process.env.GPT_KEY,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getLLMOutput(input, question)
{
  // batchText = JSON.stringify(input);
  batchText = input;

  const splitter = new langSplitterImport.RecursiveCharacterTextSplitter();

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

  const test = await retrievalChain.invoke({
    input : question
  });

  return test.answer

}

async function getFramerOutput(url) {

    try {
        // Fetch HTML content from the provided URL
        const response = await axios.get(url);
        const html = response.data;

        // Load HTML into Cheerio for easy DOM manipulation
        const $ = cheerio.load(html);

        // Extract relevant content from the Framer website
        const framerContent = $('body').text(); // Modify this to target specific elements if needed

        return framerContent;

    } catch (error) {
        console.error("Error in getting Framer output:", error);
        throw error;
    }
}

router.get('/test', (req, res) => res.send("feed route testing"));

router.get('/generateContent', async (req, res) => {

    try {
        // Check if the Authorization header is present
        if (!req.headers.authorization) {
            return res.status(401).send("Unauthorized: No token provided");
        }

        const token = req.headers.authorization.split(' ')[1];

         // Verify token with Supabase
         const { data: { user } } = await supabase.auth.getUser(token);

         if (!user) {
            return res.status(401).send("Unauthorized: Invalid token");
         }

        story = req.headers.content;

        question = "You are given a small blurb about a new tech project that is in its infancy. Give me a tweet in 200 characters or less as if you are the organization launching it. Invoke emotions and tell a masterfully crafted story with it while making it grounded and real. You are allowed to use hashtags that might apply as well."

        let output = await getLLMOutput(story, question);

        output = `${output} Generated with app.newsaify.com`;

        res.send(output);

    } catch (error)
    {
        console.error("Error in generating content:", error);
        res.status(500).send("Internal Server Error");
    }
});



module.exports = router;