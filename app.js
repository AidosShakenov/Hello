const express = require('express');
const deckRouter = require('./routes/deckRoutes');
const cardRouter = require('./routes/cardRoutes');
const lakeRouter = require('./routes/lakeRoutes');
const fishRouter = require('./routes/fishRoutes');
const countriesRouter = require('./routes/countriesRoutes');
const catchAsync = require("./utils/catchAsync");

// var Bugsnag = require('@bugsnag/js')
// var BugsnagPluginExpress = require('@bugsnag/plugin-express')

// Bugsnag.start({
//   apiKey: 'c47987ed7d2c685354c5cbbc730c49c6',
//   plugins: [BugsnagPluginExpress]
//})

const errorHandler = (err, req, res, next) => {
  res.status(400).json({ 
    error: 'Error occurred',
    message: err.message || 'An error occurred'    
   });
};

const app = express();


//var middleware = Bugsnag.getPlugin('express')
// This must be the first piece of middleware in the stack.
// It can only capture errors in downstream middleware
//app.use(middleware.requestHandler)

/* all other middleware and application routes go here */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const router = express.Router()
router.use('/Countries', countriesRouter);
router.use('/Decks', deckRouter);
router.use('/Cards', cardRouter);
router.use('/Lakes', lakeRouter);
router.use('/Fishes', fishRouter);

router.get('/testAction',  catchAsync(async (req, res, next) => {
  res.json({success: true})
}))

const baseApiRoute = app.use('/api/v1', router)
// This handles any errors that Express catches
//app.use(middleware.errorHandler)

app.use(errorHandler);

module.exports = app;
