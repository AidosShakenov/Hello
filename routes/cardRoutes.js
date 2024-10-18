const express = require('express');
const cardController = require('../controllers/cardController');

const router = express.Router();

router
  .route('/')
  .post(cardController.newCard);

router
  .route('/newcard')
  .post(cardController.createCard);
  
module.exports = router;