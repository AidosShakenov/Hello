const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const axios = require('axios');
const Card = require('../models/cardModel');

exports.createOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    //Валидация на уникальность названия
    const nameFilter = await Model.find({ name: req.body.name });
    if (nameFilter.length > 0) {
      return next(new AppError('You allready have document with that name!', 400));
    };

    let count = 0;
    let newCards = [];
    for (let i = 0; i < req.body.cards.length; i++) {
      //Проверка на количество копий
      if (req.body.cards[i].quantity > 4) {
        return next(new AppError(`You have more than 4 copies: ${req.body.cards[i].name}`, 400));
      };
      //Проверка на легальность
      let cardName = await req.body.cards[i].name;
      let nameSearch = cardName.replace(' ', '');
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`);
      cardName = response.data.data[0];
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return next(new AppError(`You have not legal card: ${cardName.name}`, 400));
      };
      //Проверка на количество карт. Не более 10
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return next(new AppError('You have more than 10 cards in your deck!', 400));
      }
      //Проверка на наличие карты в БД и добавление в БД новых карт если их нет в БД
      const cardInDb = await Card.findOne({ name: cardName.name });
      if (!cardInDb) {
        await Card.create({
          name: cardName.name,
          scryfallID: cardName.id,
          image: cardName.image_uris.normal
        });
        newCards.push(cardName.name)
      }
    };

    
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: doc,
      newCardsInDB: newCards
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const docs = await features.query;
    
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs.map (docs =>({
        id: docs.id,
        name: docs.name,
      }))
    });
  });

exports.getOne = Model =>
  catchAsync(async (req, res, next) => {

    if (req.params.id.length !== 24) {
      return next(new AppError('Invalid ID, please enter valid ID', 400));
    }
    
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    };

    res.status(200).json({
      status: 'success',
      name: doc.name,
      cards: doc.cards.map(cards => ({
        name: cards.name,
        quantity: cards.quantity
      }))
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    //Валидация на уникальность названия
    const nameFilter = await Model.find({ name: req.body.name });
    if (nameFilter.length > 0) {
      return next(new AppError('You allready have document with that name!', 400));
    };

    let count = 0;
    let newCards = [];
    for (let i = 0; i < req.body.cards.length; i++) {
      //Проверка на количество копий
      if (req.body.cards[i].quantity > 4) {
        return next(new AppError(`You have more than 4 copies: ${req.body.cards[i].name}`, 400));
      };
      //Проверка на легальность
      let cardName = await req.body.cards[i].name;
      let nameSearch = cardName.replace(' ', '');
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`);
      cardName = response.data.data[0];
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return next(new AppError(`You have not legal card: ${cardName.name}`, 400));
      };
      //Проверка на количество карт. Не более 10
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return next(new AppError('You have more than 10 cards in your deck!', 400));
      }
      //Проверка на наличие карты в БД и добавление в БД новых карт если их нет в БД
      const cardInDb = await Card.findOne({ name: cardName.name });
      if (!cardInDb) {
        await Card.create({
          name: cardName.name,
          scryfallID: cardName.id,
          image: cardName.image_uris.normal
        });
        newCards.push(cardName.name)
      }
    };

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(201).json({
      status: 'success',
      data: doc,
      newCardsInDB: newCards
    });
  });
