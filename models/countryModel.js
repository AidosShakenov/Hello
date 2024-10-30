const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  officialName: {
    type: String,
    required: true
  },
  capital: {
    type: String
  },
  //todo уникальный
  twoDigitsCode: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 2
  },
})

const country = mongoose.model('country', countrySchema);

module.exports = country
