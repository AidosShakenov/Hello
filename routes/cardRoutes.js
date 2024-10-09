const express = require('express');
const cardController = require('../controllers/cardController');

const router = express.Router();

router
  .route('/')
  .get(cardController.getAllCards);
  
module.exports = router;