const axios = require('axios');
const {body} = require('express-validator')

const catchAsync = require('../utils/catchAsync');
const country = require('../models/countryModel');

exports.addRandom = [
  catchAsync(async (req, res, next) => {

    let countryName = (Math.random() + 1).toString(36).substring(2, 9);
    let officialName = (Math.random() + 1).toString(36).substring(2, 11);
    let capital = (Math.random() + 1).toString(36).substring(2, 7);
    let twoDigitsCode = (Math.random() + 1).toString(36).substring(2, 4);
    
    await country.create({name: countryName, officialName: officialName, capital: capital, twoDigitsCode: twoDigitsCode});
    
    res.status(201).json({success: true, message: 'Random country added successfully'});
  })
]

exports.deleteRandom = [
  catchAsync(async (req, res, next) => {
   
    await country.findOneAndDelete();
           
    res.status(200).json({success: true, message: 'Random country deleted successfully'});
  })
]

exports.countryCheck = [
  catchAsync(async (req, res, next) => {
    
    const axiosResponse = await axios.get(`https://restcountries.com/v3.1/all?fields=name,cca2,capital`, {validateStatus: false});
    const axiosDocs = axiosResponse.data;
    const axiosDocsNames = axiosDocs.map(function (countries) {return countries.name.common});//список имен из API

    const countryDb = await country.find().select('name');
    const countryDbNames = countryDb.map(function (array) {return array.name}); //список имен из базы

    let UpdatedCount = 0;
    let DeletedCount = 0;
    let AddedCount = 0;
    
    let i = 0;
    for (element of countryDb) {
      if (!axiosDocsNames.includes(countryDb[i].name)) {
        await country.findByIdAndDelete(countryDb[i]._id);
        DeletedCount++;
      }
      i++;
    }

    i = 0;
    for(element of axiosDocs) {
      if (countryDbNames.includes(axiosDocs[i].name.common))
        {
          UpdatedCount++;
          await country.findOneAndUpdate(
            {name: axiosDocs[i].name.common}, 
            {
              officialName:axiosDocs[i].name.official,
              capital: axiosDocs[i].capital[0],
              twoDigitsCode: axiosDocs[i].cca2
            })
        } else {
          await country.create({
            name: axiosDocs[i].name.common,
            officialName:axiosDocs[i].name.official,
            capital: axiosDocs[i].capital[0],
            twoDigitsCode: axiosDocs[i].cca2
          });
          AddedCount++;
        };
      i++
      }

    return res.json({
      success: true,
      data: {
        UpdatedCount: UpdatedCount,
        AddedCount: AddedCount,
        DeletedCount: DeletedCount
      }
    })
  })  
]

exports.getAllCountries = [
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
    
    const countries = await country.find(query);

    if (countries.length === 0) {
      return res.status(404).json({success: false, message: 'Country not found'})
    } 
    
    res.status(200).json({
      success: true,
      totalCountries: countries.length,
      countries: countries.map(countries => ({
        name: countries.name,
        officialName: countries.officialName,
        capital: countries.capital,
        twoDigitsCode: countries.twoDigitsCode,
        id: countries._id
      }))
    })
  })
]