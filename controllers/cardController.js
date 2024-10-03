const Card = require('../models/cardModel');
const factory = require('./handlerFactory');

exports.getAllCards = factory.getAll(Card);
exports.createCard = factory.createOne(Card);
exports.getCard = factory.getOne(Card);
exports.deleteCard = factory.deleteOne(Card);
exports.updateCard = factory.updateOne(Card);
