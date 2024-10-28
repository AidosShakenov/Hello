const express = require('express');
const deckController = require('../controllers/deckController');

const router = express.Router();

router
  .route('/')
  .post(deckController.getAllDecks);

router
  .route('/new')
  .post(deckController.getAllNew);

router
  .route('/newdeck')
  .post(deckController.createDeck);

router
  .route('/newdeck/formats')
  .get(deckController.getFormats);


router
  .route('/:id')
  .get(deckController.getDeck)
  .patch(deckController.updateDeck)
  .delete(deckController.deleteDeck);

module.exports = router;
