const Joi = require("joi");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Category = require("../models/Category");
const SellerProfile = require("../models/SellerProfile");
const User = require("../models/User");
const ExpressError = require("../utils/ExpressError");

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

const indexById = (items) =>
    new Map(items.map((item) => [String(item._id), item]));

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

// Prices and availability always come from the current catalogue.
async function buildCart(references) {
    const products = await Product.find({
        _id: { $in: references.map((item) => item.productId) },
    })
        .select("name brand images variants status categoryId sellerProfileId")
        .lean();

    const [categories, sellers] = await Promise.all([
        Category.find({
            _id: { $in: products.map((product) => product.categoryId) },
        })
            .select("name slug status parentId")
            .lean(),

        SellerProfile.find({
            _id: { $in: products.map((product) => product.sellerProfileId) },
        })
            .select("userId status")
            .lean(),
    ]);

    const [parents, accounts] = await Promise.all([
        Category.find({
            _id: {
                $in: categories
                    .map((category) => category.parentId)
                    .filter(Boolean),
            },
        })
            .select("status parentId")
            .lean(),

        User.find({
            _id: { $in: sellers.map((seller) => seller.userId) },
        })
            .select("role status")
            .lean(),
    ]);

    const productMap = indexById(products);
    const categoryMap = indexById(categories);
    const sellerMap = indexById(sellers);
    const parentMap = indexById(parents);
    const accountMap = indexById(accounts);

    let subtotalPaise = 0;
    let discountPaise = 0;

    const items = references.map((reference) => {
        const productId = String(reference.productId);
        const product = productMap.get(productId);

        const variant = product?.variants.find(
            (entry) => entry.variantId === reference.variantId
        );

        const category = categoryMap.get(String(product?.categoryId));
        const parent = parentMap.get(String(category?.parentId));
        const seller = sellerMap.get(String(product?.sellerProfileId));
        const account = accountMap.get(String(seller?.userId));

        const listed = Boolean(
            product?.status === "Approved" &&
                variant &&
                category?.status === "Active" &&
                parent?.status === "Active" &&
                !parent.parentId &&
                seller?.status === "Approved" &&
                account?.status === "Active" &&
                account.role === "seller"
        );

        const validPrice =
            Number.isSafeInteger(variant?.pricePaise) &&
            variant.pricePaise > 0 &&
            Number.isSafeInteger(variant?.mrpPaise) &&
            variant.mrpPaise >= variant.pricePaise;

        const stock =
            listed &&
            validPrice &&
            Number.isSafeInteger(variant.stock) &&
            Number.isSafeInteger(variant.reservedQuantity ?? 0)
                ? Math.max(
                      0,
                      variant.stock - (variant.reservedQuantity ?? 0)
                  )
                : 0;

        const pricePaise = validPrice ? variant.pricePaise : 0;
        const mrpPaise = validPrice ? variant.mrpPaise : 0;

        const available =
            listed && validPrice && reference.quantity <= stock;

        const issue = !listed
            ? "This product or variant is currently unavailable."
            : !validPrice
              ? "Price unavailable."
              : stock === 0
                ? "Out of stock."
                : reference.quantity > stock
                  ? `Only ${stock} available.`
                  : "";

        subtotalPaise += pricePaise * reference.quantity;
        discountPaise +=
            (mrpPaise - pricePaise) * reference.quantity;

        return {
            quantity: reference.quantity,

            product: {
                _id: keyOf(reference),
                productId,
                variantId: reference.variantId,

                name: product?.name || "Unavailable product",
                brand: product?.brand || "",
                category: category?.slug || "",
                variantLabel: variant?.label || "",
                packLabel: "",

                // Cart images follow the current seller-selected product cover.
                coverImage: product?.images[0]?.url || "",

                image:
                    product?.images[0]?.url ||
                    product?.images[variant?.imageIndex]?.url ||
                    "",

                price: pricePaise / 100,
                mrp: mrpPaise / 100,
                stock,
                validPrice,

                availableForPurchase:
                    listed && validPrice && stock > 0,

                issue,

                selectedOptions: {
                    option: reference.variantId,
                },
            },

            available,
        };
    });

    return {
        items,

        cartCount: references.reduce(
            (total, item) => total + item.quantity,
            0
        ),

        subtotal: subtotalPaise / 100,
        discount: discountPaise / 100,

        canCheckout:
            items.length > 0 &&
            items.every((item) => item.available),
    };
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
                ...(await buildCart(saved.items)),
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
            const previousQuantity =
                previous.get(item.product._id) || 0;

            if (
                item.quantity > previousQuantity &&
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
                new: true,
                runValidators: true,
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