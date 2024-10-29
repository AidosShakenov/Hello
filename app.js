const express = require('express');
const deckRouter = require('./routes/deckRoutes');
const cardRouter = require('./routes/cardRoutes');
const countriesRouter = require('./routes/countriesRoutes');

// var Bugsnag = require('@bugsnag/js')
// var BugsnagPluginExpress = require('@bugsnag/plugin-express')

// Bugsnag.start({
//   apiKey: 'c47987ed7d2c685354c5cbbc730c49c6',
//   plugins: [BugsnagPluginExpress]
//})

const app = express();

//var middleware = Bugsnag.getPlugin('express')
// This must be the first piece of middleware in the stack.
// It can only capture errors in downstream middleware
//app.use(middleware.requestHandler)

/* all other middleware and application routes go here */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//todo объеденить одинаковый путь в один файл (если у трех роутов путь начинается с одного текста то отдельный роут)
app.use('/api/v1/Countries', countriesRouter);
app.use('/api/v1/Decks', deckRouter);
app.use('/api/v1/Cards', cardRouter);

// This handles any errors that Express catches
//app.use(middleware.errorHandler)

module.exports = app;