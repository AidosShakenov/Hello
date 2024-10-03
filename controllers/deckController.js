const Deck = require('./../models/deckModel');
const factory = require('./handlerFactory');
const Card = require('./../models/cardModel');

exports.getAllDecks = factory.getAll(Deck);
exports.createDeck = factory.createOne(Deck);
exports.getDeck = factory.getOne(Deck, { path: "cards", select: "name -_id"});
exports.deleteDeck = factory.deleteOne(Deck);
exports.updateDeck = factory.updateOne(Deck);
