const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  scryfallId: {
    type: String,
    required: true,
    unique: true  
  },
  image: {
    type: String, 
    required: true
  }
}); 

const card = mongoose.model('card', cardSchema);

module.exports = card;