const Joi = require("joi");

const Cart = require("../models/Cart");
const ExpressError = require("../utils/ExpressError");
const { buildCart } = require("../services/checkoutService");

const itemSchema = Joi.object({
    productId: Joi.string().hex().length(24).lowercase().required(),
    variantId: Joi.string().trim().max(80).required(),
    quantity: Joi.number().integer().min(1).max(99).required(),
});

const itemsSchema = Joi.array()
    .items(itemSchema)
    .max(50)
    .unique(
        (first, second) =>
            first.productId === second.productId &&
            first.variantId === second.variantId
    )
    .required();

const keyOf = (item) => `${item.productId}::${item.variantId}`;

function validate(body, saving = false) {
    const schema = Joi.object({
        items: itemsSchema,
        ...(saving
            ? { version: Joi.number().integer().min(0).required() }
            : {}),
    });

    const { value, error } = schema.validate(body, {
        abortEarly: true,
        allowUnknown: false,
    });

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }

    return value;
}

async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ userId }).lean();

    if (cart) return cart;

    try {
        cart = await Cart.create({ userId });
        return cart.toObject();
    } catch (error) {
        if (error.code !== 11000) throw error;
        return Cart.findOne({ userId }).lean();
    }
}

exports.quoteCart = async (req, res, next) => {
    try {
        const { items } = validate(req.body);

        res.json({
            success: true,
            cart: await buildCart(items),
        });
    } catch (error) {
        next(error);
    }
};

exports.getCart = async (req, res, next) => {
    try {
        const saved = await getOrCreateCart(req.user._id);

        res.json({
            success: true,
            cart: {
                ...await buildCart(saved.items),
                version: saved.__v,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.saveCart = async (req, res, next) => {
    try {
        const { items, version } = validate(req.body, true);
        const saved = await getOrCreateCart(req.user._id);

        if (saved.__v !== version) {
            throw new ExpressError(
                409,
                "Your cart changed in another tab. Refresh and try again."
            );
        }

        const quote = await buildCart(items);

        const previous = new Map(
            saved.items.map((item) => [keyOf(item), item.quantity])
        );

        for (const item of quote.items) {
            if (
                item.quantity > (previous.get(item.product._id) || 0) &&
                !item.available
            ) {
                throw new ExpressError(
                    409,
                    item.product.issue || "This item is unavailable."
                );
            }
        }

        // A stale tab must not overwrite a newer cart.
        const updated = await Cart.findOneAndUpdate(
            {
                _id: saved._id,
                userId: req.user._id,
                __v: version,
            },
            {
                $set: { items },
                $inc: { __v: 1 },
            },
            { 
                returnDocument: "after", 
                runValidators: true 
            }
        ).lean();

        if (!updated) {
            throw new ExpressError(
                409,
                "Your cart changed. Refresh and try again."
            );
        }

        res.json({
            success: true,
            cart: {
                ...quote,
                version: updated.__v,
            },
        });
    } catch (error) {
        next(error);
    }
};