const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');


exports.createOne = Model =>
  catchAsync(async (req, res, next) => {

    const decks = await Model.find({ name: req.body.name });
    if (decks.length > 0) {
      return next(new AppError('Create new name for deck', 400));
    };
    
    const docs = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: docs
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

exports.getOne = Model =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    
    const docs = await query;

    if (!docs) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: docs
      }
    });
  });
