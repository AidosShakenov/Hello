const mongoose = require('mongoose');
const Card = require('./cardModel');

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true    
  },
  format: {
    type: String,
    required: true,
    enum: ['standard', 'modern', 'pioneer', 'legacy', 'vintage', 'pauper']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  cards: [{
    card: {
      ref: 'Card',
      type: mongoose.Schema.ObjectId
    },
    quantity: {type: Number, required: true, min:1, max:4},      
  }]  
}); 

const Deck = mongoose.model('Deck', deckSchema);

module.exports = Deck;