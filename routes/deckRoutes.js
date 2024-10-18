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
  .post(deckController.getAllDecks);

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