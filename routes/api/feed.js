// const express = require('express');
// const router = express.Router();

// require('dotenv').config();
// const axios = require('axios');
// const cheerio = require('cheerio');

// const langImport = require('@langchain/openai')
// const langPromptImport = require('@langchain/core/prompts');
// const langSplitterImport = require('langchain/text_splitter');
// const langVectorImport = require('langchain/vectorstores/memory');
// const langCombineImport = require('langchain/chains/combine_documents');
// const langRetrieverImport = require('langchain/chains/retrieval')
// const langDocumentImport = require('@langchain/core/documents');


// const chatModel = new langImport.ChatOpenAI({
//   openAIApiKey: process.env.GPT_KEY,
// });

// const { OpenAI } = require("openai");
// const { createClient } = require('@supabase/supabase-js');

// const openai = new OpenAI({
//     organization: process.env.GPT_ORG,
//     apiKey: process.env.GPT_KEY,
// });

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// async function getLLMOutput(input, question)
// {
//   // batchText = JSON.stringify(input);
//   batchText = input;

//   const splitter = new langSplitterImport.RecursiveCharacterTextSplitter();

//   const docOutput = await splitter.splitDocuments([
//     new langDocumentImport.Document({ pageContent: batchText }),
//   ]);

//   const prompt = langPromptImport.ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

//   <context>
//   {context}
//   </context>

//   Question: {input}`);

//   const documentChain = await langCombineImport.createStuffDocumentsChain({
//     llm: chatModel,
//     prompt,
//   });

//   const embeddings = new langImport.OpenAIEmbeddings({
//     openAIApiKey: process.env.GPT_KEY,
//   });

//   const vectorstore = await langVectorImport.MemoryVectorStore.fromDocuments(
//     docOutput,
//     embeddings,
//   )

//   const retriever = vectorstore.asRetriever();

//   const retrievalChain = await langRetrieverImport.createRetrievalChain({
//     combineDocsChain: documentChain,
//     retriever,
//   })

//   const test = await retrievalChain.invoke({
//     input : question
//   });

//   return test.answer

// }

// async function getFramerOutput(url) {

//     try {
//         // Fetch HTML content from the provided URL
//         const response = await axios.get(url);
//         const html = response.data;

//         // Load HTML into Cheerio for easy DOM manipulation
//         const $ = cheerio.load(html);

//         // Extract relevant content from the Framer website
//         const framerContent = $('body').text(); // Modify this to target specific elements if needed

//         return framerContent;

//     } catch (error) {
//         console.error("Error in getting Framer output:", error);
//         throw error;
//     }
// }

// router.get('/test', (req, res) => res.send("feed route testing"));

// router.get('/generateContent', async (req, res) => {

//     // if(req.query.token === "" || req.query.token === null)
//     // {
//     //     res.status(500).send("Internal Server Error")
//     // }

//     try {
//         const content = req.query.content;
//         const framer = req.query.framer;

//         question = "You are given a written text about a new project. Give me a summary about the input text as if you are the organization itself. Be as specific as possible in four sentences maximum."

//         if (!content && !framer) {
//             return res.status(400).send("Both 'content' and 'framer' parameters are missing.");
//         }

//         if (!content) {
//             const framerContent = await getFramerOutput(framer);
//             const output = await getLLMOutput(framerContent, question);
//             return res.send(output);
//         }

//         if (!framer) {
//             const output = await getLLMOutput(content, question);
//             return res.send(output);
//         }

//         const framerContent = await getFramerOutput(framer);
//         const batchText = content + framerContent;
//         const output = await getLLMOutput(batchText, question);
//         return res.send(output);

//     } catch (error) {
//         console.error("Error in generating content:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });



// module.exports = router;