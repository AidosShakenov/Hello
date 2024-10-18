const Deck = require('./../models/deckModel');
const factory = require('./handlerFactory');

exports.getAllDecks = factory.getAll(Deck);
exports.createDeck = factory.createOneDeck(Deck);
exports.getDeck = factory.getOne(Deck);
exports.deleteDeck = factory.deleteOne(Deck);
exports.updateDeck = factory.updateOneDeck(Deck);
exports.getFormats = factory.getFormats()
