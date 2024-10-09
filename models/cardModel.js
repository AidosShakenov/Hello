const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true  
  },
  scryfallID: {
    type: String,
    required: true,
    unique: true  
  },
  image: {
    type: String, 
    required: true,
    unique: true 
  }
}); 

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;