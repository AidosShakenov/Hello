const {body} = require('express-validator')
const moment = require("moment");

const Card = require('../models/cardModel');
const Deck = require('./../models/deckModel');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY, BASE_DATE_TIME_FORMAT} = require("../utils/enums");

const checkCardsInBody = async (cards, format) => { 
  let errors = [];

  const cardsIds = cards.map(c => c.cardId);
  
  const duplicates = cardsIds.filter((e, i, a) => a.indexOf(e) !== i);
  if (duplicates.length) {
    errors.push(`You can't have duplicates in your deck! IDs: ${duplicates.join(', ')}`);};
  
  const cardsQuantity = cards.map(c => c.quantity).reduce(function(sum, current) {return sum + current}, 0);
  if(cardsQuantity > 10) {
    errors.push('You have more than 10 cards in your deck!')}

  const cardsInDb = await Card.find({_id: {$in: cardsIds}, }).select(`_id name legalTrue`)
  const cardsInDbIds = cardsInDb.map(c => c._id).toString().split(',');

  const cardsNotFound = cardsIds.filter(card => !cardsInDbIds.includes(card));
  if (cardsNotFound.length > 0) {
    errors.push(`Not found cards in DB with IDs: ${cardsNotFound.join(', ')}`)}
      
  const notLegalCards = cardsInDb.filter(card => !(card.legalTrue).includes(format)).map(card => card.name + ` (${card._id})`);
  if (notLegalCards.length>0) {
    errors.push(`'${notLegalCards.join(', ')}' not legal in ${format} format`)}

  if(errors.length > 0) {
    return errors}
}

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
  body("cards.*.cardId").isMongoId().withMessage("Card ID must be a valid MongoDB ID"),
  body("cards.*.quantity").isInt({min: 1, max:4}).withMessage("Card quantity must be 1-4"),

  catchAsync(async (req, res, next) => {

    const {format, cards} = req.body;
    const query = req.body;

    const errors = await checkCardsInBody(cards, format);
    if(errors) {throw new Error(JSON.stringify(errors))};

    const doc = await Deck.create(query);

    res.status(201).json({
      success: true,
      data: {
        id: doc.id,
        name: doc.name,
        format: doc.format,
        created: doc.createdAt
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

    const doc = await Deck.findById(id).populate('cards.cardId');

    if (!doc) {
      throw new Error('No document found with that ID');
    };

    res.json({
      success: true,
      deck: {
        id: doc.id,
        name: doc.name,
        format: doc.format,
        created: doc.createdAt,
        cards: doc.cards.map(cards => ({
          name: cards.cardId.name,
          quantity: cards.quantity,
          mongoId: cards.cardId._id
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
      throw new Error('No document found with that ID');
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
  body("cards.*.cardId").isMongoId().withMessage("Card ID must be a valid MongoDB ID"),
  body("cards.*.quantity").isInt({min: 1, max:4}).withMessage("Card quantity must be 1-4"),

  catchAsync(async (req, res, next) => {
    const {id, name, cards} = req.body;

    const deck = await Deck.findById(id);
    if (!deck) {
      throw new Error('No document found with that ID');
    }
    
    const format = deck.format;
    const query = req.body

    const errors = await checkCardsInBody(cards, format);
    if(errors) {throw new Error(JSON.stringify(errors))};

    await Deck.findByIdAndUpdate(id, query);

    res.json({
      success: true,
      message: `Your deck has been updated`
    });
  })

]
