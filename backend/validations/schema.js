const Joi = require("joi");

const name = Joi.string().trim().min(2).max(100).required();

const email = Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .max(254)
    .required();

const phone = Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required();

const password = Joi.string()
    .min(6)
    .max(72)
    .custom((value, helpers) =>
        Buffer.byteLength(value, "utf8") > 72
            ? helpers.error("any.invalid")
            : value
    )
    .required();

const identifier = Joi.alternatives().try(email, phone).required();

const confirmPassword = Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
        "any.only": "Passwords do not match.",
    });

const token = Joi.string().hex().length(64).required();

exports.signupSchema = Joi.object({
    name,
    email,
    phone,
    password,
    confirmPassword,
});

exports.loginSchema = Joi.object({
    identifier,
    password,
});

exports.sellerRegisterSchema = Joi.object({
    fullName: name,
    email,
    mobile: phone,
    password,
    confirmPassword,
    storeName: name,
    storeEmail: email,
    storePhone: phone,
    description: Joi.string().trim().max(500).allow("").default(""),
    street: Joi.string().trim().min(3).max(200).required(),
    locality: Joi.string().trim().min(2).max(100).required(),
    city: name,
    state: name,
    pincode: Joi.string().pattern(/^[1-9]\d{5}$/).required(),
});

exports.forgotPasswordRequestSchema = Joi.object({
    identifier,
});

exports.forgotPasswordVerifySchema = Joi.object({
    requestId: token,
    otp: Joi.string().pattern(/^\d{6}$/).required(),
});

exports.forgotPasswordResetSchema = Joi.object({
    resetToken: token,
    password,
    confirmPassword,
});