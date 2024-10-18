const express = require('express');
const cardController = require('../controllers/cardController');

const router = express.Router();

router
  .route('/')
  .get(cardController.getAllCards);

router
 .route('/newcard')
 .post(cardController.newCard);
  
module.exports = router;