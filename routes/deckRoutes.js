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
  .post(validate([body('name').notEmpty()]), deckController.createDeck);

router
  .route('/:id')
  .get(deckController.getDeck);

module.exports = router;