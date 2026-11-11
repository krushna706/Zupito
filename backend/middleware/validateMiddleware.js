const ExpressError = require("../utils/ExpressError");

module.exports = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: true,
        allowUnknown: false,
    });

    if (error) {
        return next(new ExpressError(400, error.details[0].message));
    }

    req.body = value;
    next();
};
