const Deck = require('./../models/deckModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

exports.getAllDecks = factory.getAll(Deck);
exports.createDeck = factory.createOne(Deck);