const express = require('express');

const countryController = require('../controllers/countryController')

const router = express.Router();

router
  .route('/')
  .post(countryController.listCountries); 

router
  .route('/sync')
  .get(countryController.syncCountries) 
  .post(countryController.addRandomCountry)
  .delete(countryController.deleteRandomCountry);

module.exports = router;
