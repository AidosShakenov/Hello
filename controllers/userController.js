const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const dotenv = require('dotenv');
const catchAsync = require('../utils/catchAsync');
const { getRandomString } = require('../utils/customFunctions');

dotenv.config({ path: './config.env'});

const jwtSecret = process.env.JWT_SECRET
const generateToken = (id) => {
  return jwt.sign({ id }, jwtSecret, { expiresIn: '1h' });
};

exports.registerUser = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({ name, email, password });

  if (user) {
    res.status(201).json({
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
});

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    res.json({
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

exports.resetPassword = catchAsync( async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }

  const newPassword = getRandomString(10)
  user.password = newPassword;

  await user.save();

  res.json({ 
    success: true, 
    message: 'Password reset successfully',
    data: {
      name: user.name,
      email: user.email,
      password: newPassword
    }
  });
})

// exports.getUser = catchAsync(async (req, res) => {
//   const user = await User.findById(req.user.id);

//   if (user) {
//     res.json({
//       name: user.name,
//       email: user.email,
//     });
//   } else {
//     res.status(404).json({ message: 'User not found' });
//   }
// });