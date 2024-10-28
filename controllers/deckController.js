const {body, validationResult} = require('express-validator')
const moment = require("moment");

const Deck = require('./../models/deckModel');
const factory = require('./handlerFactory');
const catchAsync = require("../utils/catchAsync");
const {FORMAT_ARRAY, BASE_DATE_TIME_FORMAT} = require("../utils/enums");

//todo непонятно зачем эта прослойка - было бы удобнее если бы тут были сами методы (мб не прав - тогда разъяснить зачем так надо)
exports.getAllDecks = factory.getAll(Deck);
exports.createDeck = factory.createOneDeck(Deck);
exports.getDeck = factory.getOne(Deck);
exports.deleteDeck = factory.deleteOne(Deck);
exports.updateDeck = factory.updateOneDeck(Deck);
exports.getFormats = factory.getFormats()

exports.getAllNew = [
  body("format").optional().custom((value)=> {
    return value && FORMAT_ARRAY.indexOf(value) !== -1
  }),
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
