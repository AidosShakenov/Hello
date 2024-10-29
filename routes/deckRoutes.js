const express = require('express');
const deckController = require('../controllers/deckController');

const router = express.Router();

router
  .route('/')
  .post(deckController.getAllDecks);

router
  .route('/new')
  .post(deckController.createDeck);

router
  .route('/new/formats')
  .get(deckController.getFormats);

router
  .route('/id')
  .post(deckController.getDeck)
  .patch(deckController.updateDeck)
  .delete(deckController.deleteDeck);

module.exports = router;