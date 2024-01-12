const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

const search = require("./routes/api/search");

const app = express();

dotenv.config();

app.use(cors({origin: true, credentials: true}));

app.use(express.json({extended: false}));

app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Hello World!'));

app.use('/api/search', search);

const port = process.env.PORT || 8082;

app.listen(port, () => console.log(`Server running on ${port}`));