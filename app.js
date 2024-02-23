const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const search = require("./routes/api/search");
const feed = require("./routes/api/feed");

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });

dotenv.config();

app.use(cors({origin: true, credentials: true}));

app.use(express.json({extended: false}));

app.use(bodyParser.json());

app.use(limiter);

app.get('/', (req, res) => res.send('Hello World!'));

// app.use('/api/search', search);
app.use('/api/feed', feed);


const port = process.env.PORT || 8082;

app.listen(port, () => console.log(`Server running on ${port}`));