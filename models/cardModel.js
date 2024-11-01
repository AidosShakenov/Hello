const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  //todo проверить работает ли такой индекс
  //работает для проверки есть ли такая карта уже в базе при создании
  scryfallId: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    type: String,
    required: true
  },
  legalities: {
      standard: String,
      pioneer: String,
      modern: String,
      legacy: String,
      pauper: String,
      vintage: String,
      _id: false
  }
  
});

const card = mongoose.model('card', cardSchema);

module.exports = card;
