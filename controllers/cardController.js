const Card = require('../models/cardModel');
const factory = require('./handlerFactory');

exports.newCard = factory.newCard(Card);
exports.createCard = factory.createCard(Card);