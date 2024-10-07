const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const axios = require('axios');
const Card = require('../models/cardModel');

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {

    const filter = await Model.find({ name: req.body.name });
    if (filter.length > 0) {
      return next(new AppError('You allready have document with that name!', 400));
    };
    
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    //Валидация на уникальность названия
    const nameFilter = await Model.find({ name: req.body.name });
    if (nameFilter.length > 0) {
      return next(new AppError('You allready have document with that name!', 400));
    };
        
    //Проверка на количество копий и легальность
    const cards = req.body.cards;
    cards.sort();
    let count = 1;
    for (let i = 0; i < cards.length; i++) {
      //Проверка на легальность
      let cardName = await Card.findOne({_id: req.body.cards[i]});
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${cardName.name}`);
      cardName = response.data.data[0];
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return next(new AppError(`You have not legal card: ${cardName.name}`, 400));
      };
      //Проверка на копии
      if (cards[i] === cards[i+1]) {
        count=count+1;
        if (count > 4) {
          return next(new AppError('You have more than 4 copies of one card in your deck!', 400));
        } 
      } else {
        count=1;
      }
    };

    //Проверка на количество карт
    if (req.body.cards.length > 10) {
      return next(new AppError('Your deck must contain not more than 10 cards!', 400));
    };



    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
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
      data: {
        data: docs
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
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

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    
    const fil = await Model.find({ name: req.body.name });
    if (fil.length > 0) {
      return next(new AppError('You allready have document with that name', 400));
    };
    
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.updateOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    //Валидация на уникальность названия
    const nameFilter = await Model.find({ name: req.body.name });
    if (nameFilter.length > 0) {
      return next(new AppError('You allready have document with that name!', 400));
    };
        
    //Проверка на количество копий и легальность
    const cards = req.body.cards;
    cards.sort();
    let count = 1;
    for (let i = 0; i < cards.length; i++) {
      //Проверка на легальность
      let cardName = await Card.findOne({_id: req.body.cards[i]});
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${cardName.name}`);
      cardName = response.data.data[0];
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return next(new AppError(`You have not legal card: ${cardName.name}`, 400));
      };
      //Проверка на копии
      if (cards[i] === cards[i+1]) {
        count=count+1;
        if (count > 4) {
          return next(new AppError('You have more than 4 copies of one card in your deck!', 400));
        } 
      } else {
        count=1;
      }
    };

    //Проверка на количество карт
    if (req.body.cards.length > 10) {
      return next(new AppError('Your deck must contain not more than 10 cards!', 400));
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
      data: {
        data: doc
      }
    });
  });
