const Deck = require('./../models/deckModel');
const factory = require('./handlerFactory');

exports.getAllDecks = factory.getAll(Deck);
exports.createDeck = factory.createOne(Deck);
exports.getDeck = factory.getOne(Deck);