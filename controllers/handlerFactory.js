const catchAsync = require('./../utils/catchAsync');
//const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const axios = require('axios');
const Card = require('../models/cardModel');
const moment = require('moment-timezone');

exports.createOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    
    //Проверка формата
    if(req.body.name === '') {
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
        name: docs.name,
        format: docs.format,
        //created: moment(docs.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
        id: docs.id
      }))
    })
    } else if(req.body.format !== 'standard' && 
              req.body.format !== 'modern' && 
              req.body.format !== 'pioneer' && 
              req.body.format !== 'legacy' && 
              req.body.format !== 'vintage' && 
              req.body.format !== 'pauper') {
                const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper']
                return res.status(200).json({ 
                  formats: formats
                })
              } else if (req.body.cards.length === 0) {
                  const doc = await Model.findOne();
                  return res.status(200).json({ 
                    cards: doc.cards.map(cards => ({
                      name: cards.name,
                      quantity: cards.quantity
                    }))
                  })
                }
   
    let count = 0;
    let newCards = [];
    for (let i = 0; i < req.body.cards.length; i++) {
      //Проверка на количество 
      if(req.body.cards[i].quantity < 1 || req.body.cards[i].quantity > 4) {
          return res.status(400).json({message: `You can have only 1-4 copies of ${req.body.cards[i].name}`});
      };
      
      let cardName = await req.body.cards[i].name;
      let nameSearch = cardName.replace(' ', '');
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`);
      //Проверка на наличие такой карты в скрайфоле
      if (response.data.total_cards > 1) {
        return res.status(400).json({
          message: `We found multiple cards with your card name '${req.body.cards[i].name}', please use one of folowing cards`,
          cards: response.data.data.map(card => card.name)
        });
      } 
      cardName = response.data.data[0];
      //Проверка на легальность
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return res.status(400).json({message: `You have not legal card for ${req.body.format}: ${cardName.name}`});
      };
      //Проверка на количество карт. Не более 10
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({message: 'You have more than 10 cards in your deck!'});
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
      deckId: doc.id,
      name: doc.name,
      format: doc.format,
      created: moment(doc.createdAt).locale('ru').format('DD-MM-YYYY, LT'),      
      addedCardsInDB: newCards
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    console.log(req.body.cards.length);
    res.status(200).json({
      status: 'OK'
    })
    // const features = new APIFeatures(Model.find(), req.query)
    //   .filter()
    //   .sort()
    //   .limitFields()
    //   .paginate();
    // const docs = await features.query;
    
    // res.status(200).json({
    //   status: 'success',
    //   results: docs.length,
    //   data: docs.map (docs =>({
    //     name: docs.name,
    //     format: docs.format,
    //     created: moment(docs.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
    //     id: docs.id
    //   }))
    // });
  });

exports.getFromToDate = Model =>
  catchAsync(async (req, res, next) => {
    const {fromDate, toDate, format } = req.params;
    
    if (fromDate.length !== 17 || toDate.length !== 17) {
      return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
    }

    if(format !== 'standard' && 
      format !== 'modern' && 
      format !== 'pioneer' && 
      format !== 'legacy' && 
      format !== 'vintage' && 
      format !== 'pauper') {
        return res.status(400).json({
          message: 'Please use correct format name!',
          reason: 'Valid formats are: standard, modern, pioneer, legacy, vintage, pauper'
        })
      };

    const fromDateArray = fromDate.split(/\.|\, |\:/).map(Number);
    const toDateArray = toDate.split(/\.|\, |\:/).map(Number); 

    for (let i = 0; i < fromDateArray.length; i++) {
      if (isNaN(fromDateArray[i]) || isNaN(toDateArray[i])) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
    };

    const fd = new Date(fromDateArray[2], fromDateArray[1]-1, fromDateArray[0], fromDateArray[3], fromDateArray[4], 0, 0) 
    const td = new Date(toDateArray[2], toDateArray[1]-1, toDateArray[0], toDateArray[3], toDateArray[4], 0, 0)
    
    const docs = await Model.find({ createdAt: { $gte: fd, $lte: td }, format: `${format}`});

    if (docs.length === 0) {
      return res.status(200).json({message: 'No documents found between this date range'});
    };
    
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs.map (docs =>({
        name: docs.name,
        format: docs.format,
        created: moment(docs.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
        id: docs.id
      }))
    })
  });

exports.getOne = Model =>
  catchAsync(async (req, res, next) => {

    if (req.params.id === 'newdeck') {
      return res.status(400).json({message: 'Please enter a deck format. Valid formats are: standard, modern, pioneer, legacy, vintage, pauper'});
    }

    if (req.params.id.length !== 24) {
      return res.status(400).json({message: 'Invalid ID, please enter valid ID or use newdeck/<formatName>'});
    }
    
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({message: 'No document found with that ID'});
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
      return res.status(404).json({message: 'No document found with that ID'});
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
      return res.status(400).json({message: 'You allready have document with that name!'});
    };
    //Проверка формата
    if(req.body.format !== 'standard' && 
      req.body.format !== 'modern' && 
      req.body.format !== 'pioneer' && 
      req.body.format !== 'legacy' && 
      req.body.format !== 'vintage' && 
      req.body.format !== 'pauper') {
        return res.status(400).json({
          message: 'Please enter correct format name!',
          reason: 'Valid formats are: standard, modern, pioneer, legacy, vintage, pauper'
        })
      };

    let count = 0;
    let newCards = [];
    for (let i = 0; i < req.body.cards.length; i++) {
      //Проверка на количество копий
      if(req.body.cards[i].quantity < 1 || req.body.cards[i].quantity > 4) {
        return res.status(400).json({message: `You can have only 1-4 copies of ${req.body.cards[i].name}`});
      };
      
      let cardName = await req.body.cards[i].name;
      let nameSearch = cardName.replace(' ', '');
      const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`);
      //Проверка на наличие такой карты в скрайфоле
      if (response.data.total_cards !== 1) {
        return res.status(400).json({message: `Not correct card name: ${req.body.cards[i].name}`});
      };
      cardName = response.data.data[0];
      //Проверка на легальность
      if (cardName.legalities[req.body.format] === 'not_legal') {
        return res.status(400).json({message: `You have not legal card for ${req.body.format}: ${cardName.name}`});
      };
      //Проверка на количество карт. Не более 10
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({message: 'You have more than 10 cards in your deck!'});
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
      return res.status(404).json({message: 'No document found with that ID'});
    }

    res.status(201).json({
      status: 'success',
      deckId: doc.id,
      name: doc.name,      
      addedCardsInDB: newCards
    });
  });
