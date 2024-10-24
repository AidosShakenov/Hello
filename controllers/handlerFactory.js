const catchAsync = require('./../utils/catchAsync');
const axios = require('axios');
const Card = require('../models/cardModel');
const moment = require('moment-timezone');

//Поиск карты
exports.newCard = Model => 
  catchAsync(async (req, res, next) => {
    if (req.body.name === '') { // проверка на пустое имя
      return res.status(400).json({message: 'Please enter a name'});
    };
    let nameSearch = req.body.name.replace(' ', '');
    const response = await axios.get(`https://api.scryfall.com/cards/search?q=${nameSearch}`, {validateStatus: false});
    //проверка на ошибочное введение
    if (response.status !== 200) {
      return next(res.status(404).json({message: `We not found cards with your card name '${req.body.name}'`}));
    } 
    let cards = response.data.data;
    if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format)) {
      cards = [];
      for(let i = 0; i < response.data.total_cards; i++) {
        if (response.data.data[i].legalities[req.body.format] === "legal") {
          cards.push(response.data.data[i])
        }}
      if (cards.length < 1) {
        return res.status(404).json({ messege: `Not found cards named '${req.body.name}' in '${req.body.format}' format`})
      }
    } else if (req.body.format !== '') {
      return res.status(400).json({ 
        message: `Please use correct 'format' name or empty 'format' field`, 
        formatNames: `standard, pioneer, modern, legacy, vintage, pauper`
      })
    }
    let cardsInDb = await Model.find({ scryfallId: { $in: cards.map(card => card.id)}});
    return res.status(200).json({
      totalCardsInDb: cardsInDb.length,
      cardsInDb: cardsInDb.map(cardsInDb => ({
        name: cardsInDb.name,
        id: cardsInDb._id
      })),
      totalCardsFound: cards.length,
      cards: cards.map(cards => ({
        name: cards.name,
        scryfallId: cards.id
      }))
    })
  });

// Добавление карты в базу
exports.createCard = Model =>
  catchAsync(async (req, res, next) => {
    if (req.body.scryfallId.length !==36) {
      return res.status(400).json({message: `Scryfall ID is incorrect`});
    }
    const card = await Model.find({ scryfallId: `${req.body.scryfallId}`});
    if (card.length === 1) {
      return res.status(400).json({message: `You allready have ${card[0].name} in DB`})
    }
    const response = await axios.get(`https://api.scryfall.com/cards/${req.body.scryfallId}`, {validateStatus: false});
    if (response.status!== 200) {
      return res.status(404).json({message: `We not found card with that ID`});
    }
    const cardName = response.data;
    let images = '';
    if (!cardName.image_uris) {
      images = cardName.card_faces[0].image_uris.normal + ' // ' + cardName.card_faces[1].image_uris.normal
    } else {images = cardName.image_uris.normal}
    
    const newCard = await Model.create({
      name: cardName.name,
      scryfallId: cardName.id,
      image: images
    });

    return res.status(200).json({
      message: `NEW CARD! ${cardName.name} added in DB`,
      card: {
        name: newCard.name,
        id: newCard._id,
        scryfallId: newCard.scryfallId,
        image: newCard.image
      }
    })
  })

exports.getFormats = () => 
  catchAsync(async (req, res, next) => {
    const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
    return res.status(200).json({ 
      formats: formats
    })
  });

exports.createOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    // проверка на пустое имя
    if (req.body.name === '') { 
      return res.status(400).json({message: 'Deck name cannot be empty'});
    };
    //проверка введено ли корректное название формата
    if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format) && req.body.format !== '') {
      } else {
        return res.status(400).json({ 
          message: `Please use correct 'format' name`, 
          formatNames: `standard, pioneer, modern, legacy, vintage, pauper`
        })
      }
    // Проверка на наличие карт в запросе
    if(req.body.cards.length < 1) {
      return res.status(400).json({message: 'You must have at least one card in deck'});
    }
    let count = 0;
    let duplicates = [];
    const cards = req.body.cards;
    for (let i = 0; i < req.body.cards.length; i++) {
      let card = cards[i];
      if (card.cardId.length !== 24) {
        return res.status(400).json({message: `Card ID ${card.cardId} is incorrect`});
      }
      //Проверка на существование карты в БД
      let cardInDb = await Card.findOne({_id: card.cardId});
      if(!cardInDb) {
        return res.status(404).json({message: `Card with ID ${card.cardId} not found in DB`});
      }
      const response = await axios.get(`https://api.scryfall.com/cards/${cardInDb.scryfallId}`, {validateStatus: false});
      let cardFormat = response.data;
      if (cardFormat.legalities[req.body.format] === "not_legal") {
        return res.status(400).json({message: `Card '${cardFormat.name}' (id:${cardInDb._id}) not legal in ${req.body.format} format`});
      }
      //Проверка на количество 
      if(req.body.cards[i].quantity < 1 || req.body.cards[i].quantity > 4) {
        return res.status(400).json({message: `You can have only 1-4 copies of ${req.body.cards[i].name}`});
      };
      //Проверка на количество карт в колоде
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({message: 'You have more than 10 cards in your deck!'});
      }
      if(duplicates.includes(card.cardId)) {
        return res.status(400).json({message: `You can't have duplicate cards in your deck!`});
      }
      duplicates.push(card.cardId);
      
    }
    
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success, deck created',
      deckId: doc.id,
      name: doc.name,
      format: doc.format,
      created: moment(doc.createdAt).locale('ru').format('DD-MM-YYYY, LT')
    });
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
      if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format) && req.body.format !== '') {} else {
          const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
          return res.status(400).json({
            message: `Please use correct 'format' name`,
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
      if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(400).json({
          message: `Please use correct 'format' name`, 
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
      if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(400).json({
          message: `Please use correct 'format' name`, 
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
      if(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'].includes(req.body.format) && req.body.format !== '') {} else {
        const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
        return res.status(400).json({
          message: `Please use correct 'format' name`, 
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
      success: true,
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
   
    const doc = await Model.findById(req.params.id).populate('cards.cardId');

    if (!doc) {
      return res.status(404).json({message: 'No document found with that ID'});
    };
        
    res.status(200).json({
      success: true,
      name: doc.name,
      format: doc.format,
      created: moment(doc.createdAt).locale('ru').format('DD.MM.YYYY, LT'),
      cards: doc.cards.map(cards => ({
        name: cards.cardId.name,
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

    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully'
    });
  });

exports.updateOneDeck = Model =>
  catchAsync(async (req, res, next) => {
    // проверка на пустое имя
    if (req.body.name === '') { 
      return res.status(400).json({message: 'Deck name cannot be empty'});
    };
    // Проверка на наличие карт в запросе
    const deck = await Model.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({message: 'No document found with that ID'});
    }
    if(req.body.cards.length < 1) {
      return res.status(400).json({message: 'You must have at least one card in deck'});
    }
    let count = 0;
    let duplicates = [];
    const cards = req.body.cards;
    for (let i = 0; i < req.body.cards.length; i++) {
      let card = cards[i];
      if (card.cardId.length !== 24) {
        return res.status(400).json({message: `Card ID ${card.cardId} is incorrect`});
      }
      //Проверка на существование карты в БД
      let cardInDb = await Card.findOne({_id: card.cardId});
      if(!cardInDb) {
        return res.status(404).json({message: `Card with ID ${card.cardId} not found in DB`});
      }
      const response = await axios.get(`https://api.scryfall.com/cards/${cardInDb.scryfallId}`, {validateStatus: false});
      let cardFormat = response.data;
      const deck = await Model.findById(req.params.id);
      if (cardFormat.legalities[deck.format] === "not_legal") {
        return res.status(400).json({message: `Card '${cardFormat.name}' (id:${cardInDb._id}) not legal in ${deck.format} format`});
      }
      //Проверка на количество 
      if(req.body.cards[i].quantity < 1 || req.body.cards[i].quantity > 4) {
        return res.status(400).json({message: `You can have only 1-4 copies of ${req.body.cards[i].name}`});
      };
      //Проверка на количество карт в колоде
      count = count + req.body.cards[i].quantity;
      if (count > 10) {
        return res.status(400).json({message: 'You have more than 10 cards in your deck!'});
      }
      if(duplicates.includes(card.cardId)) {
        return res.status(400).json({message: `You can't have duplicate cards in your deck!`});
      }
      duplicates.push(card.cardId);
    }
    
    await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      succes: true,
      id: req.params.id
    });
  }); 
  