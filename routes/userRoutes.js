const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', userController.signUp);
router.post('/login', userController.logIn);
router.post('/forgotpassword', userController.forgotPassword);
router.post('/resetpassword/:token', userController.resetPassword);
router.post('/updatepassword', userController.protect, userController.updatePassword);

module.exports = router;