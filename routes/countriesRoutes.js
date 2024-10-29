const express = require('express');

const countryController = require('../controllers/countryController')

const router = express.Router();

router
  .route('/')
  .post(countryController.getAllCountries);

router
  .route('/check')
  .get(countryController.countryCheck)
  .post(countryController.addRandom)
  .delete(countryController.deleteRandom);

module.exports = router;
