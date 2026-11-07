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

exports.profileUpdateSchema = Joi.object({
    name: Joi.string()
        .replace(/\s+/g, " ")
        .trim()
        .min(2)
        .max(100)
        .required(),
});

// Categories
const categoryFields = {
    name: Joi.string()
        .replace(/\s+/g, " ")
        .trim()
        .min(2)
        .max(70)
        .required(),
    parentId: Joi.string().hex().length(24).allow(null).required(),
    description: Joi.string().trim().max(240).allow("").default(""),
    sortOrder: Joi.number().integer().min(1).max(999).required(),
    attributes: Joi.array()
        .items(Joi.string().trim().min(1).max(40))
        .max(12)
        .unique((a, b) => a.toLowerCase() === b.toLowerCase())
        .required(),
    replacementAllowed: Joi.boolean().required(),
    replacementDays: Joi.number().integer().min(0).max(30).required(),
};

const categoryRules = (value, helpers) => {
    if (
        !value.parentId &&
        (
            value.attributes.length ||
            value.replacementAllowed ||
            value.replacementDays !== 0
        )
    ) {
        return helpers.message(
            "Attributes and replacement rules apply only to subcategories."
        );
    }

    if (value.replacementAllowed && value.replacementDays < 1) {
        return helpers.message(
            "Replacement request window must be between 1 and 30 days."
        );
    }

    if (!value.replacementAllowed && value.replacementDays !== 0) {
        return helpers.message(
            "Replacement days must be zero when replacement is disabled."
        );
    }

    return value;
};

exports.categoryCreateSchema = Joi.object(categoryFields).custom(categoryRules);

exports.categoryUpdateSchema = Joi.object({
    ...categoryFields,
    version: Joi.number().integer().min(0).required(),
}).custom(categoryRules);

exports.categoryStatusSchema = Joi.object({
    status: Joi.string().valid("Active", "Disabled").required(),
    reason: Joi.when("status", {
        is: "Disabled",
        then: Joi.string().trim().min(5).max(300).required(),
        otherwise: Joi.string().valid("").default(""),
    }),
    version: Joi.number().integer().min(0).required(),
});

exports.categoryListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow("").default(""),
    type: Joi.string().valid("All", "Main", "Subcategory").default("All"),
    status: Joi.string().valid("All", "Active", "Disabled").default("All"),
    page: Joi.number().integer().min(1).max(100000).default(1),
    limit: Joi.number().valid(10, 20, 50).default(10),
});

// Admin seller management
exports.adminSellerListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow("").default(""),
    status: Joi.string()
        .valid("All", "Pending", "Approved", "Rejected", "Suspended")
        .default("All"),
    page: Joi.number().integer().min(1).max(100000).default(1),
    limit: Joi.number().valid(10, 20, 50).default(10),
});

exports.adminSellerStatusSchema = Joi.object({
    action: Joi.string()
        .valid("Approve", "Reject", "Suspend", "Reactivate")
        .required(),
    reason: Joi.when("action", {
        is: Joi.valid("Reject", "Suspend"),
        then: Joi.string().trim().min(5).max(300).required(),
        otherwise: Joi.string().valid("").default(""),
    }),
    version: Joi.number().integer().min(0).required(),
});

// Seller store profile
exports.storeProfileSchema = Joi.object({
    storeName: name,
    storeEmail: email,
    storePhone: phone,
    description: Joi.string().trim().max(500).allow("").default(""),
    street: Joi.string().trim().min(3).max(200).required(),
    locality: Joi.string().trim().min(2).max(100).required(),
    city: name,
    state: name,
    pincode: Joi.string().pattern(/^[1-9]\d{5}$/).required(),
    pickupNotes: Joi.string().trim().max(200).allow("").default(""),
    removeLogo: Joi.boolean().default(false),
    version: Joi.number().integer().min(0).required(),
});