const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env'});

const app = require('./app');

const port = process.env.PORT || 3000;

mongoose
  .connect('mongodb+srv://aidos:M3mFOoR5SiwwKtjp@mtgdecks.lqyzq.mongodb.net/', {})
  .then(() => console.log('Connected to DB'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});