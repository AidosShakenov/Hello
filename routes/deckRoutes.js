const express = require('express');
const deckController = require('../controllers/deckController');

const router = express.Router();

router
  .route('/')
  .get(deckController.getAllDecks)
  .post(deckController.createDeck);

module.exports = router;