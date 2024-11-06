const axios = require('axios');
const {body} = require('express-validator')
const dotenv = require('dotenv');

const catchAsync = require('../utils/catchAsync');
const Country = require('../models/countryModel');
const customFunctions = require('../utils/customFunctions');

dotenv.config({ path: '../config.env'});

exports.addRandomCountry = [
  catchAsync(async (req, res, next) => {
    
    let countryName = customFunctions.getRandomString(7);
    let officialName = customFunctions.getRandomString(10);
    let capital = customFunctions.getRandomString(5);
    
    let stringLength = 1;
    let twoDigitsCode = '';
    do {
      twoDigitsCode = customFunctions.getRandomString(2);
      const twoDigitsCodesInDb = await Country.find({ twoDigitsCode: twoDigitsCode});
      stringLength = twoDigitsCodesInDb.length      
    } while (stringLength === 1)

    await Country.create({name: countryName, officialName: officialName, capital: capital, twoDigitsCode: twoDigitsCode});
    
    res.json({success: true, message: 'Random country added successfully'});
  })
]

exports.deleteRandomCountry = [
  catchAsync(async (req, res, next) => {

    await Country.findOneAndDelete();

    res.json({success: true, message: 'Random country deleted successfully'});
  })
]

exports.syncCountries = [
  catchAsync(async (req, res, next) => {

    const axiosConfig = {
      methos: 'get',
      url: process.env.REST_COUNTRY_URL,
      params: {fields: 'name,cca2,capital'},      
      validateStatus: false
    }
    const axiosResponse = await axios(axiosConfig);
    
    const axiosDocs = axiosResponse.data;
    const axiosDocsCodes = axiosDocs.map(countries => {return countries.cca2});
    
    const countryDb = await Country.find().select('twoDigitsCode');
    const countryDbCodes = countryDb.map(codes => {return codes.twoDigitsCode});

    let deletePromises = [];
    countryDb.forEach(element => {
      if(!axiosDocsCodes.includes(element.twoDigitsCode)) {
        deletePromises.push(Country.findByIdAndDelete(element._id))
      }
    });
    
    let upsertPromises = [];
    let updatedCount = 0;
    let addedCount = 0;
    axiosDocs.forEach(element => {
      upsertPromises.push(Country.findOneAndUpdate(
        {twoDigitsCode: element.cca2},
        {
          name: element.name.common,
          officialName: element.name.official,
          capital: element.capital[0],
          twoDigitsCode: element.cca2
        },
        {upsert: true}
      ))
      if(countryDbCodes.includes(element.cca2)) {updatedCount++}
      else {addedCount++}
    })

    const deleteResults = await Promise.all(deletePromises);
    const upsertResults = await Promise.all(upsertPromises);

    return res.json({
      success: true,
      data: {
        DeletedCount: deleteResults.length,
        UpdatedCount: updatedCount,
        AddedCount: addedCount,
        UpsertedCount: upsertResults.length
      }
    })
  })
]

exports.listCountries = [
  body(['name', 'capital']).optional().isString(),
  body('twoDigitsCode').optional().isString().isLength({min: 2, max: 2}),

  catchAsync(async (req, res, next) => {
    const query = {};

    if (req.body.name) {
      query.name = req.body.name
    };
    if (req.body.capital) {
      query.capital = req.body.capital
    };
    if (req.body.twoDigitsCode) {
      query.twoDigitsCode = req.body.twoDigitsCode
    };

    const countries = await Country.find(query);

    if (countries.length === 0) {
      throw new Error( 'Country not found')
    }

    res.json({
      success: true,
      totalCountries: countries.length,
      countries: countries.map(country => ({
        name: country.name,
        officialName: country.officialName,
        capital: country.capital,
        twoDigitsCode: country.twoDigitsCode,
        id: country._id
      }))
    })
  })
]
