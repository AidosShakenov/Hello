const express = require('express');
const deckRouter = require('./routes/deckRoutes');
const cardRouter = require('./routes/cardRoutes');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/v1/Decks', deckRouter);
app.use('/api/v1/Cards', cardRouter);

module.exports = app;