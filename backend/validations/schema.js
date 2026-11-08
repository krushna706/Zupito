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

// Seller products
const productFields = {
    name: Joi.string().trim().min(3).max(150).required(),
    brand: Joi.string().trim().min(2).max(80).required(),
    categoryId: Joi.string().hex().length(24).required(),
    description: Joi.string().trim().min(20).max(5000).required(),
    highlights: Joi.array()
        .items(Joi.string().trim().min(1).max(200))
        .max(10)
        .required(),
    specifications: Joi.array()
        .items(Joi.object({
            label: Joi.string().trim().min(1).max(40).required(),
            value: Joi.string().trim().min(1).max(500).required(),
        }))
        .max(30)
        .unique((a, b) => a.label.toLowerCase() === b.label.toLowerCase())
        .required(),
    imageKeys: Joi.array()
        .items(Joi.string().max(300).required())
        .min(1)
        .max(4)
        .unique()
        .required(),
    variants: Joi.array()
        .items(Joi.object({
            variantId: Joi.string().guid({ version: "uuidv4" }).required(),
            sku: Joi.string()
                .trim()
                .uppercase()
                .pattern(/^[A-Z0-9_-]{3,30}$/)
                .required(),
            label: Joi.string().trim().min(1).max(80).required(),
            pricePaise: Joi.number().integer().min(1).max(1000000000).required(),
            mrpPaise: Joi.number().integer().min(1).max(1000000000).required(),
            stock: Joi.number().integer().min(0).max(999999).required(),
            imageIndex: Joi.number().integer().min(0).max(3).required(),
        }))
        .min(1)
        .max(50)
        .required(),
    stockReason: Joi.string()
        .valid("", "Restock", "Adjustment", "Damage/Loss")
        .default(""),
    stockNote: Joi.string().trim().max(300).allow("").default(""),
};

const productRules = (value, helpers) => {
    const variants = value.variants;

    if (
        new Set(variants.map((item) => item.sku)).size !== variants.length ||
        new Set(variants.map((item) => item.variantId)).size !== variants.length
    ) {
        return helpers.message("Variant IDs and SKUs must be unique.");
    }

    if (variants.some((item) =>
        item.mrpPaise < item.pricePaise ||
        item.imageIndex >= value.imageKeys.length
    )) {
        return helpers.message("Check variant MRP and image selection.");
    }

    return value;
};

exports.productCreateSchema = Joi.object(productFields).custom(productRules);

exports.productUpdateSchema = Joi.object({
    ...productFields,
    version: Joi.number().integer().min(0).required(),
}).custom(productRules);

exports.sellerProductListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow("").default(""),
    status: Joi.string()
        .valid("All", "Pending", "Approved", "Rejected", "Suspended")
        .default("All"),
    page: Joi.number().integer().min(1).max(100000).default(1),
    limit: Joi.number().valid(10, 20, 50).default(10),
});

// Seller inventory
const inventorySearch = Joi.string().trim().max(100).allow("").default("");
const inventoryPage = Joi.number().integer().min(1).max(100000).default(1);
const inventoryLimit = Joi.number().valid(10, 20, 50).default(10);

const inventorySku = Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9_-]{3,30}$/)
    .required();

exports.inventoryListSchema = Joi.object({
    search: inventorySearch,
    status: Joi.string()
        .valid("All", "In Stock", "Low Stock", "Out of Stock", "Needs Attention")
        .default("All"),
    threshold: Joi.number().integer().min(1).max(100).default(5),
    page: inventoryPage,
    limit: inventoryLimit,
});

exports.inventoryHistorySchema = Joi.object({
    search: inventorySearch,
    sku: Joi.string().trim().uppercase().max(30).allow("").default(""),
    type: Joi.string()
        .valid("All", "Opening", "Restock", "Adjustment", "Damage/Loss")
        .default("All"),
    page: inventoryPage,
    limit: inventoryLimit,
});

exports.inventoryChangeSchema = Joi.object({
    sku: inventorySku,
    mode: Joi.string().valid("add", "set", "remove").required(),
    quantity: Joi.number().integer().min(0).max(999999).required(),
    reason: Joi.string().trim().min(5).max(300).required(),
    reference: Joi.string().trim().uppercase().max(80).allow("").default(""),
    version: Joi.number().integer().min(0).required(),
    operationId: Joi.string().guid({ version: "uuidv4" }).required(),
});

exports.inventoryImportSchema = Joi.object({
    mode: Joi.string().valid("add", "set").required(),
    reference: Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z0-9_-]{3,80}$/)
        .required(),
    reason: Joi.string().trim().min(5).max(300).required(),
});

exports.inventoryCsvRowSchema = Joi.object({
    sku: inventorySku,
    stock: Joi.string()
        .pattern(/^(0|[1-9]\d{0,5})$/)
        .required(),
});

const productReviewFields = {
    action: Joi.string()
        .valid("Approve", "Reject", "Suspend", "Reactivate")
        .required(),

    reason: Joi.string()
        .trim()
        .max(300)
        .when("action", {
            is: Joi.valid("Reject", "Suspend"),
            then: Joi.string().min(5).required(),
            otherwise: Joi.string().allow("").default(""),
        }),
};

exports.adminProductListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow("").default(""),

    status: Joi.string()
        .valid("All", "Pending", "Approved", "Rejected", "Suspended")
        .default("All"),

    categoryId: Joi.string()
        .hex()
        .length(24)
        .lowercase()
        .allow("")
        .default(""),

    page: Joi.number().integer().min(1).max(100000).default(1),

    limit: Joi.number().valid(10, 20, 50).default(10),
});

exports.adminProductDecisionSchema = Joi.object({
    ...productReviewFields,

    version: Joi.number()
        .integer()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .required(),
});

exports.adminProductBulkSchema = Joi.object({
    ...productReviewFields,

    action: Joi.string().valid("Approve", "Reject").required(),

    items: Joi.array()
        .items(
            Joi.object({
                productId: Joi.string()
                    .hex()
                    .length(24)
                    .lowercase()
                    .required(),

                version: Joi.number()
                    .integer()
                    .min(0)
                    .max(Number.MAX_SAFE_INTEGER)
                    .required(),
            })
        )
        .min(1)
        .max(50)
        .unique("productId")
        .required(),
});