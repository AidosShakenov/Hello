const {body, param} = require('express-validator')

const catchAsync = require("../utils/catchAsync");
const Country = require('../models/countryModel');
const Fish = require('../models/fishModel');
const Lake = require('../models/lakeModel');

exports.list = [
  catchAsync(async (req, res) => {
    const lakes = await Lake.find()
    res.json({
      success: true,
      lakesInDb: lakes.length, 
      lakes: lakes.map(lake => ({
        name: lake.name,        
        id: lake._id,
      }))
    })
  })
]

exports.get = [
  [
    param('id').isMongoId().withMessage('Invalid lake ID')
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const lake = await Lake.findById(id).populate('countries.countryId fishes.fishId');
    if (!lake) {throw new Error(`Lake with id ${id} not found`)}
    res.json({
      success: true, 
      data: {
        name: lake.name,
        area: lake.area,
        countries: lake.countries.map(country => ({
          name: country.countryId.name,
          id: country.countryId._id
        })),
        fishes: lake.fishes.map(fish => ({
          name: fish.fishId.name,
          id: fish.fishId._id
        }))}
    })
  })
]

// const lakeFieldValidation = [
//   body('name').notEmpty().isString().withMessage('Name is required'),
//   body('area').isInt().withMessage('Area must be a number'),
//   body('countries').isArray({min: 1}).withMessage('Lake must have at least one country'),
//   body('countries.*.countryId').isMongoId().custom(async (value) => {
//     if (!(await Country.findById(value))) {throw new Error(`Country with id ${value} not found`)}
//   }),
//   body('fishes').isArray().optional(),
//   body('fishes.*.fishId').isMongoId().optional().custom(async (value) => {
//     if (!(await Fish.findById(value))) {throw new Error(`Fish with id ${value} not found`)}
//   })
// ];

// const updateLake = async (lake, props) => {
//   const { name, area, countries, fishes } = props;
  
//   lake.name = name;
//   lake.area = area;
//   lake.countries = countries;
//   lake.fishes = fishes;
// };

// exports.create = [
//   [
//     ...lakeFieldValidation
//   ],
//   catchAsync(async (req, res, next) => {
//     const name = req.body.name;

//     if(await Lake.countDocuments({name: `${name}`})) 
//       {throw new Error("Lake with this name exists")};

//     const lake = new Lake();
//     await updateLake(lake, req.body);
//     await lake.save();
//     res.json({success: true, id: lake._id})
//   })
// ];

// exports.update = [
//   [
//     body('_id').isMongoId().withMessage('Invalid lake ID'),
//     ...lakeFieldValidation
//   ],
//   catchAsync(async (req, res) => {
//     const { _id } = req.body;
//     const lake = await Lake.findById(_id);
//     if (!lake) {throw new Error(`Lake with id ${_id} not found`)}

//     await updateLake(lake, req.body);
//     await lake.save();
//     res.json({success: true})
//   })
// ];

// exports.delete = [
//   [
//     body('_id').isMongoId().withMessage('Invalid lake ID')
//   ],
//   catchAsync(async (req, res) => {
//     const { _id } = req.body;
//     const lake = await Lake.findOneAndDelete({ _id: _id});
//     if (!lake) {throw new Error(`Lake with id ${_id} not found`)};
//     res.json({success: true})
//   })
// ];