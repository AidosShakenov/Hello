const {body} = require('express-validator')
const moment = require("moment");
const axios = require('axios');

const Card = require('../models/cardModel');
const Deck = require('./../models/deckModel');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY, BASE_DATE_TIME_FORMAT} = require("../utils/enums");

exports.getAllDecks = [

  body("format").optional().custom((value)=> {return value && FORMAT_ARRAY.indexOf(value) !== -1}),
  body(["fromDate", "toDate"]).optional().matches(/\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}/gim),

  catchAsync(async (req, res, next)=>{
    const {format} = req.body
    const query = {}
    if(format){
      query.format = format
    }
    if(req.body.fromDate){
      const fromDate = moment.utc(req.body.fromDate, BASE_DATE_TIME_FORMAT)
      query.createdAt = {$gte: fromDate.toDate()}
    }
    if(req.body.toDate){
      const toDate = moment.utc(req.body.toDate, BASE_DATE_TIME_FORMAT)
      query.createdAt = {$lte: toDate.toDate()}
    }

    const decks = await Deck.find(query)

    res.json({
      success: true,
      decks: decks.map(deck => ({
        name: deck.name,
        format: deck.format,
        createdAt: deck.createdAt,
        id: deck._id,
      }))
    })
  })
]

exports.createDeck = [

  body("name").notEmpty().withMessage("Name of deck is required"),
  body("format").notEmpty().custom((value)=> {return value && FORMAT_ARRAY.indexOf(value) !== -1}),
  body("cards").isArray({min: 1}).withMessage("Deck must contain at least one card"),
  body("cards.*.card").isMongoId().withMessage("Card ID must be a valid MongoDB ID"),
  body("cards.*.quantity").isInt({min: 1, max:4}).withMessage("Card quantity must be 1-4"),

  catchAsync(async (req, res, next) => {

    const {name, format, cards} = req.body;
    const query = req.body

    let count = 0;
    let duplicates = [];

    //todo foreach
    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      //Проверка на существование карты в БД
      let cardInDb = await Card.findOne({_id: card.card});
      //todo если нет 2ух карт то сообщение об ошибке должно быть по обеим картам (это надо до foreach проверять)
      if(!cardInDb) {
        return res.status(404).json({success: false, message: `Card with ID ${card.card} not found in DB`});
      }
      //todo при сохранении деки мы не должны дергать аксиос - у нас вся инфа должна уже быть
      const response = await axios.get(`https://api.scryfall.com/cards/${cardInDb.scryfallId}`, {validateStatus: false});
      let cardAxios = response.data;
      //Проверка на легальность
      //todo проверку на легальность - одну для всех и в ошибки
      if (cardAxios.legalities[format] === "not_legal") {
        return res.status(400).json({success: false, message: `Card '${cardAxios.name}' (id:${cardInDb._id}) not legal in ${deckFormat} format`});
      }
      //Проверка на количество карт в колоде
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({success: false, message: 'You have more than 10 cards in your deck!'});
      }
      if(duplicates.includes(card.card)) {
        return res.status(400).json({success: false, message: `You can't have duplicate cards in your deck!`});
      }
      duplicates.push(card.card);
    }

    const doc = await Deck.create(query);

    res.status(201).json({
      success: true,
      data: {
        deckId: doc.id,
        name: doc.name,
        format: doc.format,
        created: moment(doc.createdAt).locale('ru').format('DD-MM-YYYY, LT')
      }
    });
  })
]

exports.getFormats = [
  catchAsync(async (req, res, next) => {
    res.json({success: true, formats: FORMAT_ARRAY});
  })
]

exports.getDeck = [

  body("id").isMongoId().withMessage("Invalid deck ID"),

  catchAsync(async (req, res, next) => {
    const {id} = req.body;

    const doc = await Deck.findById(id).populate('cards.card');

    if (!doc) {
      return res.status(404).json({success: false, message: 'No document found with that ID'});
    };

    res.json({
      success: true,
      deck: {
        id: doc.id,
        name: doc.name,
        format: doc.format,
        created: moment(doc.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
        cards: doc.cards.map(cards => ({
          name: cards.card.name,
          quantity: cards.quantity
          //todo емана где id
        }))
      }
    });
  })
]

exports.deleteDeck = [

  body("id").isMongoId().withMessage("Invalid deck ID"),

  catchAsync(async (req, res, next) => {
    const {id} = req.body;
    const doc = await Deck.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({message: 'No document found with that ID'});
    }

    res.status(200).json({
      status: 'success',
      message: 'Deck deleted'
    });
  })
]

exports.updateDeck = [
  body("id").isMongoId().withMessage("Invalid deck ID"),
  body("name").optional().notEmpty().withMessage("Name of deck is required"),
  body("cards").isArray({min: 1}).withMessage("Deck must contain at least one card"),
  body("cards.*.card").isMongoId().withMessage("Card ID must be a valid MongoDB ID"),
  body("cards.*.quantity").isInt({min: 1, max:4}).withMessage("Card quantity must be 1-4"),

  catchAsync(async (req, res, next) => {
    const {id, name, cards} = req.body;

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({success: false, message: 'No document found with that ID'});
    }
    const format = deck.format;
    const query = req.body

    let count = 0;
    let duplicates = [];

    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      //Проверка на существование карты в БД
      let cardInDb = await Card.findOne({_id: card.card});
      if(!cardInDb) {
        return res.status(404).json({success: false, message: `Card with ID ${card.card} not found in DB`});
      }
      const response = await axios.get(`https://api.scryfall.com/cards/${cardInDb.scryfallId}`, {validateStatus: false});
      let cardAxios = response.data;
      //Проверка на легальность
      if (cardAxios.legalities[format] === "not_legal") {
        return res.status(400).json({success: false, message: `Card '${cardAxios.name}' (id:${cardInDb._id}) not legal in ${deckFormat} format`});
      }
      //Проверка на количество карт в колоде
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({success: false, message: 'You have more than 10 cards in your deck!'});
      }
      if(duplicates.includes(card.card)) {
        return res.status(400).json({success: false, message: `You can't have duplicate cards in your deck!`});
      }
      duplicates.push(card.card);
    }

    await Deck.findByIdAndUpdate(id, query);

    res.json({
      success: true,
      message: `Your deck '${name}' has been updated`
    });
  })

]
