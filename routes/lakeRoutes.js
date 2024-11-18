const express = require('express');
const lakeController = require('../controllers/lakeController');

const router = express.Router();

router
  .route('/')
  .get(lakeController.list);

router
  .route('/:id')
  .get(lakeController.get)
//   .patch(lakeController.update)
//   .delete(lakeController.delete);

// router
//   .route('/new')
//   .post(lakeController.create);

module.exports = router;