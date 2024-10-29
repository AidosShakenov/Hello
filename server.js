const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = require('./app');

dotenv.config({ path: './config.env'});

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {})
  .then(() => console.log('Connected to DB'));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
