const {body} = require('express-validator');
const axios = require('axios');
const dotenv = require('dotenv');

const Card = require('../models/cardModel');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY} = require("../utils/enums");

dotenv.config({ path: '../config.env'});

exports.newCard = [

  body("format").optional().custom((value)=> {
    return value && FORMAT_ARRAY.indexOf(value) !== -1
  }),
  body("name").isString(),

  catchAsync(async (req, res, next) => {

    const {name, format} = req.body;
    
    let axiosConfig = {
      method: 'get',
      url: `${process.env.SCRYFALL_SEARCH_URL}/search`,
      params: {q: name},
      validateStatus: false}
    const axiosResponse = await axios(axiosConfig);

    if (axiosResponse.status !== 200) {
      throw new Error(`We not found cards with your string '${name}'`)
    }
    
    const responseData = axiosResponse.data.data;
    const responseScryfallIdList = responseData.map(cards => cards.id);
    
    let cards = [];
    const cardsFoundInDb = await Card.find({scryfallId: {$in: responseScryfallIdList}});
    const cardsScryallIdList = cardsFoundInDb.map(cards => cards.scryfallId);
    
    for(let i = 0; i < axiosResponse.data.total_cards; i++) {
      if (!format || (format && responseData[i].legalities[format] === "legal")) {
        if (cardsScryallIdList.includes(responseData[i].id)) {
          cards.push({'name': responseData[i].name, 'id': responseData[i].id, 'mongoId': cardsFoundInDb.find(card => card.scryfallId === responseData[i].id).id});
        } else {
          cards.push({'name': responseData[i].name, 'id': responseData[i].id})
        }
      }
    }
        
    return res.json({
      success: true,
      message: `Cards with '${name}' in name found in Scryfall`,
      totalCardsFoundInScryfall: cards.length,
      totalCardsFoundInDb: cardsFoundInDb.length,
      cards: cards.map(cards => ({
        name: cards.name,
        scryfallId: cards.id,
        mongoId: cards.mongoId
      }))
    })
  })
]


exports.createCard = [

  body("scryfallId").isString().isLength({min: 36, max:36}).withMessage("Invalid Scryfall ID"),

  catchAsync(async (req, res, next) => {
    const {scryfallId} = req.body;

    const card = await Card.findOne({ scryfallId: `${scryfallId}`});
    if (card) {
      throw new Error(`You allready have ${card.name} in DB`)
    }

    let axiosConfig = {
      method: 'get',
      url: `${process.env.SCRYFALL_SEARCH_URL}/${scryfallId}`, 
      validateStatus: false}
    const axiosResponse = await axios(axiosConfig);
    
    if (axiosResponse.status!== 200) {
      throw new Error(`We not found card with that ID`);
    }

    const cardName = axiosResponse.data;
    const images = 
      !cardName.image_uris
        ? (cardName.card_faces[0].image_uris.normal + ' // ' + cardName.card_faces[1].image_uris.normal)
        : cardName.image_uris.normal;
    
    let legalities = [];
    FORMAT_ARRAY.forEach(format => {if(cardName.legalities[format] === 'legal') legalities.push(format)})
  
    
    const newCard = await Card.create({
      name: cardName.name,
      scryfallId: cardName.id,
      image: images,
      legalTrue: legalities
    });

    return res.json({
      success: true,
      message: `NEW CARD! ${cardName.name} added in DB`,
      card: {
        name: newCard.name,
        id: newCard._id,
        scryfallId: newCard.scryfallId,
        image: newCard.image,
        legalTrue: legalities
      }
    })
  })
]
