const {validationResult} = require("express-validator");
module.exports = fn => {
  return (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new Error(JSON.stringify(result.array()))
    }
    fn(req, res, next).catch(next);
  };
};
