const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Need a deck name'],
    unique: true  
  },
  color: { 
    type: String, 
    required: [true, 'Need a deck color']
  }
}); 

const Deck = mongoose.model('Deck', deckSchema);

module.exports = Deck;