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
  },
  //todo legalities - тут лучше сделать legalities: [String] (точнее не лучше - но для опыта норм))
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
