const express = require('express');
const cardController = require('../controllers/cardController');
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
  .get(cardController.getAllCards)
  .post(validate([body('name').notEmpty()]), cardController.createCard);

router
  .route('/:id')
  .get(cardController.getCard)
  .patch(validate([body('name').notEmpty()]), cardController.updateCard)
  .delete(cardController.deleteCard);


module.exports = router;