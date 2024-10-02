const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env'});

const app = require('./app');

const port = process.env.PORT || 3000;

const DB = process.env.DATABASE;
mongoose
  .connect(DB, {})
  .then(() => console.log('Connected to DB'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});