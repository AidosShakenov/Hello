const express = require('express');

const fishController = require('../controllers/fishController');
const { protect } = require('../utils/authentication');

const router = express.Router();

router
  .route('/')
  .post(fishController.list);

router
  .route('/:id')
  .get(fishController.get)
  .patch(protect, fishController.update)
  .delete(protect, fishController.delete);

router
  .route('/new')
  .post(protect, fishController.create);

module.exports = router;