const {body} = require('express-validator')

const catchAsync = require("../utils/catchAsync");
const Country = require('../models/countryModel');
const Fish = require('../models/fishModel');
const Lake = require('../models/lakeModel');

exports.getFishesByProps = [

  body('name').optional(),
  body(['fromSize','toSize']).optional().isInt(),
  body('lakes').optional().isMongoId().custom(
    async (value) => {
      if (!(await Lake.findById(value))) {throw new Error(`Lake with id ${value} not found`)}
    }
  ),
  body('countries').optional().isMongoId().custom(
    async (value) => {
      if (!(await Country.findById(value))) {throw new Error(`Country with id ${value} not found`)}
    }
  ),

  catchAsync(async (req, res, next) =>{
    const {name, fromSize, toSize, lakes, countries} = req.body;
    let query = {}
    
    let fishPromises = []
    let lakePromises = []
    let lakeIds = []
    let fishIds = []
    
    
    if (countries && lakes) {
      countries.forEach(country => {lakePromises.push(Lake.find({_id: {$in: lakes}, countries: {countryId: country}}).select('_id'))})
    } else if (countries) {
      countries.forEach(country => {lakePromises.push(Lake.find({countries: {countryId: country}}).select('_id'))})// Пихаем айди озер по странам
    } else if (lakes) {
      lakePromises.push(Lake.find({_id: {$in: lakes}}).select('_id')) // Пихаем айди озер из боди
    }

    const lakePromisesData = await Promise.all(lakePromises) //Ищем все озера по айди
    lakePromisesData.forEach(lakes => {lakes.forEach(lake => {lakeIds.push(lake._id.toString())})}) //Объединяем все айди озер
        
    lakeIds.forEach(lake => {fishPromises.push(Fish.find({lakes: {lakeId: lake}}))}) //Пихаем все поиски рыб по озерам
    const fishPromisesData = await Promise.all(fishPromises)//Ищем все рыбы

    fishPromisesData.forEach(fishes => {fishes.forEach(fish => {fishIds.push(fish._id.toString())})}) //Объедняем всех рыб
    
    if (name) 
      query.name = new RegExp(name, 'i');
    if (fromSize) 
      query.size = { $gte: fromSize};
    if (toSize) 
      query.size = {$lte: toSize};
    if (fromSize && toSize) 
      query.size = { $gte: fromSize, $lte: toSize}
    
    if (fishIds.length > 0) {query._id = {$in: fishIds}}
    
    const fishes = await Fish.find(query);    
    
    if (countries || lakes) {
      if(fishIds.length < 1) {
        throw new Error(`Fishes not found with that properties`)
      } 
    }
    if (fishes.length<1) {
      throw new Error(`Fishes not found with that properties`)
    } else {
      res.json({
        success: true,
        totalFound: fishes.length,
        fishes: fishes.map(fish => ({
          fishId: fish._id,
          name: fish.name,
          size: fish.size
        }))
      })
    }
  })
]

exports.list = [
  catchAsync(async (req, res) => {
    const fishes = await Fish.find()
    res.json({
      success: true, 
      fishesInDb: fishes.length,
      fishes: fishes.map(fish => ({
        name: fish.name,
        fishId: fish._id,
        size: fish.size
      }))
    })
  })
]

exports.get = [
  [
    body('_id').isMongoId().withMessage('Invalid fish ID')
  ],
  catchAsync(async (req, res) => {
    const { _id } = req.body;
    const fish = await Fish.findById(_id).populate('lakes.lakeId');
    if (!fish) {throw new Error(`Fish with id ${_id} not found`)}
    res.json({
      success: true, 
      data: {
        name: fish.name,
        _id: fish._id,
        size: fish.size,
        lakes: fish.lakes.map(lake => ({
          lakeName: lake.lakeId.name,
          lakeId: lake.lakeId._id
        }))
      }
    })
  })
];

// const fishFieldValidation = [
//   body('name').notEmpty().isString().withMessage('Name is required'),
//   body('size').isInt().withMessage('Size must be a number'),
//   body('lakes').isArray({min: 1}).withMessage('Fish must have at least one lake'),
//   body('lakes.*.lakeId').isMongoId().custom(async (value) => {
//     if (!(await Lake.findById(value))) {throw new Error(`Lake with id ${value} not found`)}
//   })
// ];

// const updateFish = async (fish, props) => {
//   const { name, size, lakes } = props;
  
//   fish.name = name;
//   fish.size = size;
//   fish.lakes = lakes;
// };

// exports.create = [
//   [
//     ...fishFieldValidation
//   ],
//   catchAsync(async (req, res, next) => {
//     const name = req.body.name;

//     if(await Fish.countDocuments({name: `${name}`})) 
//       {throw new Error("fish with this name exists")};

//     const fish = new Fish();
//     await updateFish(fish, req.body);
//     await fish.save();
//     res.json({success: true, id: fish._id})
//   })
// ];

// exports.update = [
//   [
//     body('_id').isMongoId().withMessage('Invalid fish ID'),
//     ...fishFieldValidation
//   ],
//   catchAsync(async (req, res) => {
//     const { _id } = req.body;
//     const fish = await Fish.findById(_id);
//     if (!fish) {throw new Error(`Fish with id ${_id} not found`)}

//     await updateFish(fish, req.body);
//     await fish.save();
//     res.json({success: true})
//   })
// ];

// exports.delete = [
//   [
//     body('_id').isMongoId().withMessage('Invalid fish ID')
//   ],
//   catchAsync(async (req, res) => {
//     const { _id } = req.body;
//     const fish = await Fish.findOneAndDelete({ _id: _id});
//     if (!fish) {throw new Error(`Fish with id ${_id} not found`)};
//     res.json({success: true})
//   })
// ];