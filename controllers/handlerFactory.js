const catchAsync = require('./../utils/catchAsync');
const axios = require('axios');
const Card = require('../models/cardModel');
const moment = require('moment-timezone');
const dotenv = require('dotenv');
dotenv.config({ path: '../config.env'});

exports.createCard = Model =>
  catchAsync(async (req, res, next) => {
    if (req.body.scryfallId.length !==36) {
      return next(res.status(400).json({message: `Scryfall ID is incorrect`}));
    }
    const card = await Model.find({ scryfallId: `${req.body.scryfallId}`});
    if (card.length === 1) {
      return res.status(200).json({
        message: `You allready have ${card[0].name} in DB`,
        name: card[0].name,
        scryfallId: card[0].scryfallId,
        image: card[0].image
      })
    }
    const response = await axios.get(`https://api.scryfall.com/cards/${req.body.scryfallId}`, {validateStatus: false});
    if (response.status!== 200) {
      return next(res.status(404).json({message: `We not found card with that ID`}));
    }
    
    const cardName = response.data;
    const newCard = await Model.create({
      name: cardName.name,
      scryfallId: cardName.id,
      image: cardName.image_uris.normal
    });

    return res.status(200).json({
      message: `New card ${cardName.name} added in DB`,
      name: newCard.name,
      scryfallId: newCard.scryfallId,
      image: newCard.image
    })
  })

exports.newCard = Model =>
  catchAsync(async (req, res, next) => {
    if (req.body.name === '') { // проверка на пустое имя
      const cards = await Model.find();
      return res.status(200).json({
        result: cards.length,
        cards: cards.map(cards => ({
          name: cards.name,
          scryfallId: cards.scryfallId,
          image: cards.image
        })) 
      });
    };
    let cardName = await req.body.name;
    let nameSearch = cardName.replace(' ', '');
    const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`, {validateStatus: false});
    //проверка на ошибочное введение
    if (response.status !== 200) {
      return next(res.status(404).json({message: `We not found cards with your card name '${req.body.name}'`}));
    } 
    //Проверка на наличие такой карты в скрайфоле
    if (response.data.total_cards > 1) {
      return res.status(400).json({
        cards: response.data.data.map(card => card.name)
      });
    }
    cardName = response.data.data[0];
    res.status(201).json({
      name: cardName.name,
      scryFallId: cardName.id,
      image: cardName.image_uris.normal
    });
    
  });

exports.getFormats = () => 
  catchAsync(async (req, res, next) => {
    const formats = process.env.FORMATS.split(', ');
    return res.status(200).json({ 
      formats: formats
    })
  });

exports.createOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    if (req.body.name === '') { // проверка на пустое имя
      return res.status(400).json({message: 'Deck name cannot be empty'});
    };
    if(process.env.FORMATS.includes(req.body.format) && req.body.format !== '') { //проверка введено ли корректное название формата
      if (req.body.cards.length === 0) {
        const doc = await Model.findOne({format: req.body.format});
        return res.status(200).json({ 
          cards: doc.cards.map(cards => ({
            name: cards.name,
            quantity: cards.quantity
          }))
        })
      } else {
        let count = 0;
        let newCards = [];
        for (let i = 0; i < req.body.cards.length; i++) {
          //Проверка на количество 
          if(req.body.cards[i].quantity < 1 || req.body.cards[i].quantity > 4) {
              return res.status(400).json({message: `You can have only 1-4 copies of ${req.body.cards[i].name}`});
          };
          
          const response = await axios.get(`https://api.scryfall.com/cards/${req.body.cards[i].scryfallId}`, {validateStatus: false});
          //проверка на ошибочное введение
          if (response.status !== 200) {
            return res.status(404).json({message: `We not found cards with your scryfall ID '${req.body.cards[i].scryfallId}'`});
          } 
          //Проверка на наличие такой карты в скрайфоле
          cardName = response.data;
          console.log(cardName);
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
              scryfallId: cardName.id,
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
      };
    } else {
        const formats = process.env.FORMATS.split(', ');
        return res.status(200).json({ 
          formats: formats
        })
    };
  });
    

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const {fromDate, toDate, format } = req.body;
    let docs = {};      
    const fromDateArray = fromDate.split(/\.|\, |\:/).map(Number);
    const toDateArray = toDate.split(/\.|\, |\:/).map(Number); 
    //Заполнены все поля
    if (fromDate && toDate && format) {
      if(fromDate.length !== 17 || toDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      if(process.env.FORMATS.includes(req.body.format) && req.body.format !== '') {} else {
          const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
          return res.status(200).json({ 
            formats: formats
          })
        };
      for (let i = 0; i < fromDateArray.length; i++) {
        if (isNaN(fromDateArray[i]) || isNaN(toDateArray[i])) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const fd = new Date(fromDateArray[2], fromDateArray[1]-1, fromDateArray[0], fromDateArray[3], fromDateArray[4], 0, 0) 
      const td = new Date(toDateArray[2], toDateArray[1]-1, toDateArray[0], toDateArray[3], toDateArray[4], 0, 0)
      docs = await Model.find({ createdAt: { $gte: fd, $lte: td }, format: `${format}`});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    //Нет поля формат
    if (fromDate && toDate && !format) {
      if (fromDate.length !== 17 || toDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      for (let i = 0; i < fromDateArray.length; i++) {
        if (isNaN(fromDateArray[i]) || isNaN(toDateArray[i])) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const fd = new Date(fromDateArray[2], fromDateArray[1]-1, fromDateArray[0], fromDateArray[3], fromDateArray[4], 0, 0) 
      const td = new Date(toDateArray[2], toDateArray[1]-1, toDateArray[0], toDateArray[3], toDateArray[4], 0, 0)
      docs = await Model.find({ createdAt: { $gte: fd, $lte: td }});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    //Только поле "дата с"
    if (fromDate && !toDate && !format) {
      if (fromDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      for (let i = 0; i < fromDateArray.length; i++) {
        if (isNaN(fromDateArray[i])) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const fd = new Date(fromDateArray[2], fromDateArray[1]-1, fromDateArray[0], fromDateArray[3], fromDateArray[4], 0, 0) 
      docs = await Model.find({ createdAt: { $gte: fd}});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    //Только поле "дата до"
    if (!fromDate && toDate && !format) {
      if (toDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      for (let i = 0; i < toDateArray.length; i++) {
        if (isNaN(isNaN(toDateArray[i]))) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const td = new Date(toDateArray[2], toDateArray[1]-1, toDateArray[0], toDateArray[3], toDateArray[4], 0, 0)
      docs = await Model.find({ createdAt: {$lte: td }});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    // Только поле формат
    if (!fromDate && !toDate && format) {
      if(process.env.FORMATS.includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(200).json({ 
          formats: formats
        })
      };
      docs = await Model.find({format: `${format}`});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    // Нет поля "дата с"
    if (!fromDate && toDate && format) {
      if (toDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      if(process.env.FORMATS.includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(200).json({ 
          formats: formats
        })
      };
      for (let i = 0; i < toDateArray.length; i++) {
        if (isNaN(toDateArray[i])) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const td = new Date(toDateArray[2], toDateArray[1]-1, toDateArray[0], toDateArray[3], toDateArray[4], 0, 0)
      docs = await Model.find({ createdAt: { $lte: td }, format: `${format}`});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    // Нет поля "дата до"
    if (fromDate && !toDate && format) {
      if (fromDate.length !== 17) {
        return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
      }
      if(process.env.FORMATS.includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(200).json({ 
          formats: formats
        })
      };
      for (let i = 0; i < fromDateArray.length; i++) {
        if (isNaN(fromDateArray[i])) {
          return res.status(400).json({message: 'Please enter valid date format. Example: DD.MM.YYYY, HH:MM'});
        }
      };
      const fd = new Date(fromDateArray[2], fromDateArray[1]-1, fromDateArray[0], fromDateArray[3], fromDateArray[4], 0, 0)
      docs = await Model.find({ createdAt: { $gte: fd }, format: `${format}`});
      if (docs.length === 0) {
        return res.status(200).json({message: 'No documents found between this date range'});
      };
    }
    // Пустые поля
    if (!fromDate && !toDate && !format) {      
      docs = await Model.find();
    }  

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
      format: doc.format,
      created: moment(doc.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
      cards: doc.cards.map(cards => ({
        scryfallId: cards.scryfallId,
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

      const response = await axios.get(`https://api.scryfall.com/cards/${req.body.cards[i].scryfallId}`);
      //Проверка на наличие такой карты в скрайфоле
      cardName = response.data;
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
