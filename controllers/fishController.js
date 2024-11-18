const {body, param} = require('express-validator')

const catchAsync = require("../utils/catchAsync");
const Country = require('../models/countryModel');
const Fish = require('../models/fishModel');
const Lake = require('../models/lakeModel');

exports.list = [

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
    
    if (name) 
      query.name = new RegExp(name, 'i');

    let fishPromises = []
    let lakePromises = []
    let lakeIds = []
    let fishIds = []
    
    if (countries && lakes) {
      countries.forEach(country => {lakePromises.push(Lake.find({_id: {$in: lakes}, countries: {countryId: country}}).select('_id'))})
    } else if (countries) {
      countries.forEach(country => {lakePromises.push(Lake.find({countries: {countryId: country}}).select('_id'))})
    } else if (lakes) {
      lakePromises.push(Lake.find({_id: {$in: lakes}}).select('_id')) 
    }

    const lakePromisesData = await Promise.all(lakePromises) 
    lakePromisesData.forEach(lakes => {
      lakes.forEach(lake => {
        lakeIds.push(lake._id.toString())}
      )
    })
        
    lakeIds.forEach(lake => {
      fishPromises.push(Fish.find({lakes: {lakeId: lake}}))
    }) 
    const fishPromisesData = await Promise.all(fishPromises)

    fishPromisesData.forEach(fishes => {fishes.forEach(fish => {fishIds.push(fish._id.toString())})})
    if (fishIds.length > 0) {query._id = {$in: fishIds}}
    
    if (fromSize && toSize) {
      query.size = { $gte: fromSize, $lte: toSize}
    } else if (fromSize) {
      query.size = { $gte: fromSize};
    } else if (toSize) {
      query.size = {$lte: toSize};
    }
    
    const fishes = await Fish.find(query);    
    
    if (fishes.length<1) {
      res.json({
        success: false,
        totalFound: 0,
        fishes: []
      })
    } else {
      res.json({
        success: true,
        totalFound: fishes.length,
        fishes: fishes.map(fish => ({
          id: fish._id,
          name: fish.name,
          size: fish.size
        }))
      })
    }
  })
]

exports.get = [
  [
    param('id').isMongoId().withMessage('Invalid fish ID')
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const fish = await Fish.findById(id).populate('lakes.lakeId');
    if (!fish) {
      throw new Error(`Fish with id ${id} not found`)
    } else {
    res.json({
        success: true, 
        data: {
          name: fish.name,
          size: fish.size,
          lakes: fish.lakes.map(lake => ({
            name: lake.lakeId.name,
            id: lake.lakeId._id
          })),
          updatedBy: fish.updatedBy,
          updatedAt: fish.updatedAt
        }
      })
    }
  })
];

const fishFieldValidation = [
  body('name').notEmpty().isString().withMessage('Name is required'),
  body('size').isInt().withMessage('Size must be a number'),
  body('lakes').isArray({min: 1}).withMessage('Fish must have at least one lake'),
  body('lakes.*.lakeId').isMongoId().custom(async (value) => {
    if (!(await Lake.findById(value))) {throw new Error(`Lake with id ${value} not found`)}
  })
];

const updateFish = async (fish, props) => {
  const { name, size, lakes, updatedBy } = props;
  
  fish.name = name;
  fish.size = size;
  fish.lakes = lakes;
  fish.updatedBy = updatedBy;
  fish.updatedAt = Date.now();
};

exports.create = [
  [
    ...fishFieldValidation
  ],
  catchAsync(async (req, res, next) => {
    const data = req.body
    
    if(await Fish.countDocuments({name: `${data.name}`})) 
      {res.json({success: false, message: "Fish with this name exists"})};

    data.updatedBy = req.user.email;

    const fish = new Fish();
    await updateFish(fish, data);
    await fish.save();
    res.json({success: true, id: fish._id})
  })
];

exports.update = [
  [
    param('id').isMongoId().withMessage('Invalid fish ID'),
    ...fishFieldValidation
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const data = req.body
    data.updatedBy = req.user.email
    
    const fish = await Fish.findById({_id: id});
    if (!fish) {
      res.json({
        success: false, 
        message: `Fish with id ${id} not found`
      })
    } else {
      await updateFish(fish, data);
      await fish.save();
      res.json({success: true})
    }    
  })
];

exports.delete = [
  [
    param('id').isMongoId().withMessage('Invalid fish ID')
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const fish = await Fish.findByIdAndDelete({_id: id});
    if (!fish) {
      res.json({
        success: false, 
        message: `Fish with id ${id} not found`
      })
    } else {
      res.json({success: true})
    }
  })
];