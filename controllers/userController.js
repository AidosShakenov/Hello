const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const {body} = require('express-validator')

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.signUp = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body("passwordConfirm").custom((value, {req}) => 
    {if (value !== req.body.password) {throw new Error('Paswords do not match')} else {return value}}),

  catchAsync(async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;
  
    const newUser = await User.create({
      name: name,
      email: email,
      password: password,
      passwordConfirm: passwordConfirm
    });
  
    if (newUser) {
      res.json({
        name: newUser.name,
        email: newUser.email,
        token: generateToken(newUser._id),
      });
    } else {
      res.json({success: false, message: 'Invalid user data' });
    }
  }) 
]

exports.logIn = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  
  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
  
    const user = await User.findOne({ email }).select('+password');
  
    if (!user || !(await user.correctPassword(password, user.password))) {
      res.json({success: false, message: 'Incorrect email or password'});
    } else {
      res.json({
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    }
  })
]

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
  }
  if (!token) {
    res.json({success: false, message: 'Not authorized, no token' });
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    res.json({success: false, message: 'User recently changed password! Please log in again.' });
  } else {
    req.user = currentUser;
    res.locals.user = currentUser;
    next()
  }
});

exports.forgotPassword = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  
  catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      res.json({success: false, message: 'There is no user with email address.' });
    }
  
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
  
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    
    res.json({
      success: true,
      message: resetURL
    });
  })
]

exports.resetPassword = [
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body("passwordConfirm").custom((value, {req}) => 
    {if (value !== req.body.password) {throw new Error('Paswords do not match')} else {return value}}),

  catchAsync(async (req, res, next) => {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
  
    
    if (!user) {
      res.json({success: false, message: 'Token is invalid or has expired' });    
    } else {
  
      user.password = req.body.password;
      user.passwordConfirm = req.body.passwordConfirm;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
  
      res.json({
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    }
  })
];

exports.updatePassword = [
  body("passwordCurrent").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body("passwordConfirm").custom((value, {req}) => 
    {if (value!== req.body.password) {throw new Error('Paswords do not match')} else {return value}}),

  catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
  
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      res.json({success: false, message: 'Your current password is wrong' });    
    }
  
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
  
    res.json({
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  })
]