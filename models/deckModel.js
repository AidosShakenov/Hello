const mongoose = require('mongoose');

const {FORMAT_ARRAY} = require("../utils/enums");

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true    
  },
  format: {
    type: String,
    required: true,
    enum: FORMAT_ARRAY
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  cards: [{
    cardId: {
      ref: 'card',
      type: mongoose.Schema.ObjectId
    },
    quantity: {type: Number, required: true, min:1, max:4},
    _id: false   
  }]  
}); 

const deck = mongoose.model('deck', deckSchema);

module.exports = deck;