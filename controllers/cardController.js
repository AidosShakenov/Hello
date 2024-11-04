const {body} = require('express-validator');
const axios = require('axios');

const Card = require('../models/cardModel');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY} = require("../utils/enums");
const {SCRYFALL_NAME_SEARCH_URL, SCRYFALL_ID_SEARCH_URL} = require("../utils/axiosUrls");

exports.newCard = [

  body("format").optional().custom((value)=> {
    return value && FORMAT_ARRAY.indexOf(value) !== -1
  }),
  body("name").isString(),

  catchAsync(async (req, res, next) => {

    const {name, format} = req.body;

    //todo гет параметры в конфиг аксиоса надо
    const response = await axios.get(SCRYFALL_NAME_SEARCH_URL+name, {validateStatus: false});
    if (response.status !== 200) {
      return next(res.status(404).json({success: false, message: `We not found cards with your card name '${name}'`}));
    }

    let totalCardsFoundInDb = 0
    let cards = [];
    let mongoId = {}
    //todo эта проверка бесполезна - ее валидатор проверяет

    //Она нужна для добавления легальных карт в список, в else просто делает список всех карт соответствующих имени поиска

    //тогда лучше вот так
    for(let i = 0; i < response.data.total_cards; i++) {
      if (!format || (format && response.data.data[i].legalities[format] === "legal")) {
        mongoId = {};
        //todo а вот тут надо один запрос вместо кучи в форе
        mongoId = await Card.findOne({scryfallId: response.data.data[i].id}).select('_id');
        if (mongoId) {
          totalCardsFoundInDb++;
          cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id, 'mongoId': mongoId._id});
        } else {
          cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id})
        }

      }
    }
    if (cards.length < 1) {
      return res.status(404).json({ messege: `Not found cards named '${name}' in '${format}' format`})
    }
    //тогда лучше вот так
    // if(format) {
    //   cards = [];
    //   for(let i = 0; i < response.data.total_cards; i++) {
    //     if (response.data.data[i].legalities[format] === "legal") {
    //         mongoId = {};
    //         mongoId = await Card.findOne({scryfallId: response.data.data[i].id}).select('_id');
    //         if (mongoId) {
    //           totalCardsFoundInDb++;
    //           cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id, 'mongoId': mongoId._id});
    //         } else {cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id})}
    //
    //     }}
    //   if (cards.length < 1) {
    //     return res.status(404).json({ messege: `Not found cards named '${name}' in '${format}' format`})
    //   }
    // } else {
    //   for(let i = 0; i < response.data.total_cards; i++) {
    //     mongoId = {};
    //     mongoId = await Card.findOne({scryfallId: response.data.data[i].id}).select('_id');
    //     if (mongoId) {
    //       totalCardsFoundInDb++;
    //       cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id, 'mongoId': mongoId._id});
    //     } else {cards.push({'name': response.data.data[i].name, 'id': response.data.data[i].id})}
    //     }
    //   if (cards.length < 1) {
    //     return res.status(404).json({ messege: `Not found cards named '${name}' in '${format}' format`})
    //   }
    // };

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

    //todo findOne - когда нужна одна ищем одну
    const card = await Card.find({ scryfallId: `${scryfallId}`});
    if (card.length === 1) {
      return res.status(400).json({succes: false, message: `You allready have ${card[0].name} in DB`})
    }

    //todo https://apidog.com/blog/params-axios-get-request/ - параметр q в переменные
    const response = await axios.get(SCRYFALL_ID_SEARCH_URL+scryfallId, {validateStatus: false});
    if (response.status!== 200) {
      return res.status(404).json({success: false, message: `We not found card with that ID`});
    }

    const cardName = response.data;
    let images = '';
    if (!cardName.image_uris) {
      images = cardName.card_faces[0].image_uris.normal + ' // ' + cardName.card_faces[1].image_uris.normal
    } else {
      images = cardName.image_uris.normal
    }
    // можно вот так тут
    // const images = !cardName.image_uris? (cardName.card_faces[0].image_uris.normal + ' // ' + cardName.card_faces[1].image_uris.normal):cardName.image_uris.normal;
    //

    const newCard = await Card.create({
      name: cardName.name,
      scryfallId: cardName.id,
      image: images,
      legalities: {
        standard: cardName.legalities.standard,
        pioneer: cardName.legalities.pioneer,
        modern: cardName.legalities.modern,
        pauper: cardName.legalities.pauper,
        vintage: cardName.legalities.vintage,
        legacy: cardName.legalities.legacy
      }
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
