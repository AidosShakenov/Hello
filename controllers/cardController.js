const {body} = require('express-validator');
const axios = require('axios');

const Card = require('../models/cardModel');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY} = require("../utils/enums");

exports.newCard = [

  body("format").optional().custom((value)=> {
    return value && FORMAT_ARRAY.indexOf(value) !== -1
  }),
  body("name").isString(),

  catchAsync(async (req, res, next) => {

    const {name, format} = req.body;

    //todo эт че такое
    let nameSearch = name.replace(' ', '');
    //todo ссылку в конфиг
    //todo гет параметры в конфиг аксиоса надо
    const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`, {validateStatus: false});
    if (response.status !== 200) {
      return next(res.status(404).json({success: false, message: `We not found cards with your card name '${name}'`}));
    }
    //todo поиск только тех карт которые нам пришли из базы
    const cardsScryfallId = await Card.find().select('scryfallId');
    const scryfallIdArray = cardsScryfallId.map(function (array) {return array.scryfallId}); //список имен из базы

    let totalCardsFoundInDb = 0
    let cards = [];
    //todo эта проверка бесполезна - ее валидатор проверяет
    if(FORMAT_ARRAY.includes(format)) {
      totalCardsFoundInDb = 0;
      cards = [];
      for(let i = 0; i < response.data.total_cards; i++) {
        if (response.data.data[i].legalities[format] === "legal") {
          if (scryfallIdArray.includes(response.data.data[i].id)) {
            const mongoId = await Card.findOne({scryfallId: response.data.data[i].id}).select('_id');
            cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id, 'mongoId': mongoId._id});
            totalCardsFoundInDb++;
          } else {
            cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id})
          }
        }}
      if (cards.length < 1) {
        return res.status(404).json({ messege: `Not found cards named '${name}' in '${format}' format`})
      }
    } else {
      for(let i = 0; i < response.data.total_cards; i++) {
        if (scryfallIdArray.includes(response.data.data[i].id)) {
            const mongoId = await Card.findOne({scryfallId: response.data.data[i].id}).select('_id');
            cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id, 'mongoId': mongoId._id});
            totalCardsFoundInDb++;
          } else {
            cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id})
          }
        }
      if (cards.length < 1) {
        return res.status(404).json({ messege: `Not found cards named '${name}' in '${format}' format`})
      }
    };

    return res.json({
      totalCardsFoundInScryfall: cards.length,
      totalCardsFoundInDb: totalCardsFoundInDb,
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

    const card = await Card.find({ scryfallId: `${scryfallId}`});
    if (card.length === 1) {
      return res.status(400).json({succes: false, message: `You allready have ${card[0].name} in DB`})
    }

    const response = await axios.get(`https://api.scryfall.com/cards/${scryfallId}`, {validateStatus: false});
    if (response.status!== 200) {
      return res.status(404).json({success: false, message: `We not found card with that ID`});
    }

    const cardName = response.data;
    let images = '';
    if (!cardName.image_uris) {
      images = cardName.card_faces[0].image_uris.normal + ' // ' + cardName.card_faces[1].image_uris.normal
    } else {images = cardName.image_uris.normal}

    const newCard = await Card.create({
      name: cardName.name,
      scryfallId: cardName.id,
      image: images
    });

    return res.json({
      message: `NEW CARD! ${cardName.name} added in DB`,
      card: {
        name: newCard.name,
        id: newCard._id,
        scryfallId: newCard.scryfallId,
        image: newCard.image
      }
    })
  })
]
