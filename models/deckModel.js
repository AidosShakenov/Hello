const mongoose = require('mongoose');

const Card = require('../models/cardModel');

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true  
  },
  cards: [{
    type: mongoose.Schema.ObjectId,
    ref: Card
  }]
}); 

const Deck = mongoose.model('Deck', deckSchema);

module.exports = Deck;