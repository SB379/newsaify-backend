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


router.get('/test', (req, res) => res.send("search route testing"));

router.get('/summary', async (req, res) => {

  // const input = req.inputText;

  const input =  "Is a part-time job feasible in the academic environment we live in? Attending college isn\’t what we used to think it was when we were younger. It\’s not just classes and living with your friends, but rather it\’s joining extracurricular activities to build your resume, navigating the world of internships, and trying to figure out what career path you want to take. There are a lot of unknowns in this period of our lives and, on top of that, many of us want part-time jobs. Part-time jobs could be wanted for several different reasons, whether it\’s to pay tuition, get a break from academics, or just to get some extra spending money. Whatever the reason is, it can be tricky to achieve this goal. This often isn\’t because of the lack of jobs available, although that could be the case at certain times of the year. But even though this may happen, there are usually jobs available somewhere in the desired vicinity, so then what is the problem? It is possible that it could be due to being particular about your job preference. Students may look for a specific niche of a job, but those are not always available. But if a student is really in need of a part-time job and the reason that they do not want to take a job is because of being just picky and not having logical reasons, such as allergies or other restricting concerns, they should at least try to keep an open mind about it. But one should not fret if they do not prefer to work in certain industries, such as the food industry, because often there are other jobs available, such as in the retail industry. Many basic-level jobs at retail stores do not require much, if any, prior work experience, which could relieve some struggles on the job search. When it comes to the hiring process for part-time jobs, students do not need to worry about not having enough work experience in that specific sector. Even if you are applying to work at a clothing store but only have past experience working as a teacher\’s assistant, hiring managers will likely take that into consideration. It is also important to consider distance from work, your residence, and your classes. Since it is very likely that you have a schedule set for your classes and are potentially already in the swing of attending them, you do not want a job that would interfere. So, it is important to factor in how much time your classes, as well as your extracurricular activities, studying, and leisure time, will take. Then you can know when exactly you can and cannot work. So next time you\’re on the job hunt, keep these factors in mind. There is a lot more than just working that goes into a part-time job, so make sure to consider them!";
  
  // question = "You are given a written text about a certain topic. Give me a headline about what the text is about as if you were selling me the article. Be as specific as possible in three sentences maximum."
  question = "You are given a written text about a certain topic. Give me a summary about the input text as if you are the text itself. Be as specific as possible in four sentences maximum."

  const results = await getLLMOutput(input, question);

  const returnJSON = {
    TLDR: results,
  }

  // const { data, error } = await supabase.from('movies').insert([
  //   {
  //     name: 'The Empire Strikes Back',
  //     description:
  //       'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.',
  //   },
  //   {
  //     name: 'Return of the Jedi',
  //     description:
  //       'After a daring mission to rescue Han Solo from Jabba the Hutt, the Rebels dispatch to Endor to destroy the second Death Star.',
  //   },
  // ])
  

  res.send(returnJSON);
});

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

        let batchText = "";

        for (const url of allLinks) {
          try {
            const urlResponse = await axios.get(url);
        
            const $ = cheerio.load(urlResponse.data);
        
            const text = extractVisibleText($);
   
            // Concatenate the text to batchText
            batchText += text + '\n'; // Adjust the delimiter or formatting as needed
          } catch (error) {
            // console.error(`Error fetching or processing data for URL ${url}:`, error.message);
            // Handle the error accordingly, for example, log it or continue with the next URL.
          }
        }

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
          // input : `You are given multiple news articles with varying bias. Give me accurate facts stripping the bias only about the ${q}. Return this in array format.`
          input : `You are given multiple news articles with varying bias. Give me a few facts from each that might inform someone about these events. Return this in array format.`
          // input: `Give me the facts presented by this news article about the SVB Crash. There might be some text that does not pertain to the article. Strip bias, only give facts.`,
        });

        console.log(test.answer);

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
};

async function getArticles() {
  
  const response = await axios.get(`https://api.congress.gov/v3/summaries?limit=50&api_key=${process.env.POLITICS_KEY}`)
  // const response = await axios.get(`https://api.congress.gov/v3/bill?api_key=${process.env.POLITICS_KEY}`)

  return(response.data);
}

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

  console.log(test.answer)

  return test.answer

}

  

module.exports = router;