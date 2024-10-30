const express = require('express');

const countryController = require('../controllers/countryController')

const router = express.Router();

router
  .route('/')
  .post(countryController.getAllCountries); //todo getAll по названию не принимает параметры , listCountries принимает

router
  .route('/check')
  .get(countryController.countryCheck) //todo переназвать - syncCountries
  .post(countryController.addRandom) //todo - addRandomCountry
  .delete(countryController.deleteRandom);//todo - deleteRandomCountry

module.exports = router;
