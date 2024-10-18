const Card = require('../models/cardModel');
const factory = require('./handlerFactory');

exports.getAllCards = factory.getAll(Card);
exports.newCard = factory.newCard(Card);