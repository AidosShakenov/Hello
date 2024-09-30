const express = require('express');
const mongoose = require('mongoose');
const deckRouter = require('./routes/deckRoutes');
const deckSchema = require('./models/deckModel');
const bodyParser = require('body-parser');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/v1/Decks', deckRouter);

module.exports = app;