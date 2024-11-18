const express = require('express');
const { registerUser, loginUser, getUserProfile, resetPassword } = require('../controllers/userController');
const { protect } = require('../utils/authentication');

const router = express.Router();

router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/resetpassword', protect, resetPassword);

module.exports = router;