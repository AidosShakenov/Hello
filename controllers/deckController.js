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

    const {format, cards} = req.body;
    const query = req.body

    const cardsIds = cards.map(c => c.card);
    const cardsInDb = await Card.find({_id: {$in: cardsIds}, }).select(`_id name legalities`)
    const cardsInDbIds = cardsInDb.map(c => c._id).toString().split(',')

    let count = 0;
    let duplicates = [];
    let cardsNotFound = [];
    let errors = [];
    cards.forEach(element => {
      count = count + element.quantity;
      if (count > 10) {
        errors.push('You have more than 10 cards in your deck!')
      }
      if(duplicates.includes(element.card)) {
        errors.push(`You can't have duplicate (id: ${element.card}) cards in your deck!`);
      }
      duplicates.push(element.card);
      if(!cardsInDbIds.includes(element.card)) {
        cardsNotFound.push(element.card)
      }
    });
    if (cardsNotFound.length > 0) {
      errors.push(`Not found cards with IDs: ${cardsNotFound.join(', ')}`)
    }
    
    cardsInDb.forEach(element => {
      if (element.legalities[format] === "not_legal") {
        errors.push(`'${element.name}' (id:${element._id}) not legal in ${format} format`)
      }
    });

    if(errors.length > 0) {
      return res.status(400).json({success: false, errors: errors});
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
          quantity: cards.quantity,
          mongoId: cards.card._id
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

    res.json({
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

    const cardsIds = cards.map(c => c.card);
    const cardsInDb = await Card.find({_id: {$in: cardsIds}, }).select(`_id name legalities`)
    const cardsInDbIds = cardsInDb.map(c => c._id).toString().split(',')

    let count = 0;
    let duplicates = [];
    let cardsNotFound = [];
    let errors = [];
    cards.forEach(element => {
      count = count + element.quantity;
      if (count > 10) {
        errors.push('You have more than 10 cards in your deck!')
      }
      if(duplicates.includes(element.card)) {
        errors.push(`You can't have duplicate (id: ${element.card}) cards in your deck!`);
      }
      duplicates.push(element.card);
      if(!cardsInDbIds.includes(element.card)) {
        cardsNotFound.push(element.card)
      }
    });
    if (cardsNotFound.length > 0) {
      errors.push(`Not found cards with IDs: ${cardsNotFound.join(', ')}`)
    }
    
    cardsInDb.forEach(element => {
      if (element.legalities[format] === "not_legal") {
        errors.push(`'${element.name}' (id:${element._id}) not legal in ${format} format`)
      }
    });

    if(errors.length > 0) {
      return res.status(400).json({success: false, errors: errors});
    }
    
    await Deck.findByIdAndUpdate(id, query);

    res.json({
      success: true,
      message: `Your deck has been updated`
    });
  })

]
