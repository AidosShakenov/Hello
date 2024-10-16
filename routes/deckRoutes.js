const express = require('express');
const deckController = require('../controllers/deckController');
const { body } = require('express-validator');

const router = express.Router();

const validate = validations => {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) {
        return res.status(400).json({ errors: result.array() });
      }      
    }
    next();
  };
};

router
  .route('/')
  .get(deckController.getAllDecks)
  .post(validate([body('name').notEmpty()]), validate([body('format').notEmpty()]), deckController.createDeck);

router
  .route('/fromDate/:fromDate/toDate/:toDate/format/:format')
  .get(deckController.getFromToDate);

router
  .route('/newdeck/:format')
  .get(deckController.deckJson);

router
  .route('/:id')
  .get(deckController.getDeck)
  .patch(validate([body('name').notEmpty()]), validate([body('format').notEmpty()]), deckController.updateDeck)
  .delete(deckController.deleteDeck);

module.exports = router;