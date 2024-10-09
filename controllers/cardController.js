const Card = require('../models/cardModel');
const factory = require('./handlerFactory');

exports.getAllCards = factory.getAll(Card);