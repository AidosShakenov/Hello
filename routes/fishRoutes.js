const express = require('express');
const fishController = require('../controllers/fishController');

const router = express.Router();

router
  .route('/')
  .get(fishController.list)
  .post(fishController.getFishesByProps);

router
  .route('/id')
  .post(fishController.get);
//   .patch(fishController.update)
//   .delete(fishController.delete);

// router
//   .route('/new')
//   .post(fishController.create);

module.exports = router;