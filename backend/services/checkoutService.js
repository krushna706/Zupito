const mongoose = require("mongoose");
const { createHash } = require("node:crypto");

const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Product = require("../models/Product");
const Category = require("../models/Category");
const SellerProfile = require("../models/SellerProfile");
const User = require("../models/User");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const ExpressError = require("../utils/ExpressError");

const { displayPricing, RESERVATION_MS } = require("../config/orderRules");

const keyOf = (item) => `${item.productId}::${item.variantId}`;

const indexById = (items) => new Map(items.map((item) => [String(item._id), item]));

// Prices and availability come from the current catalogue.
async function buildCart(references, session = null) {
    const products = await Product.find({
        _id: { $in: references.map((item) => item.productId) },
    })
        .select("name brand images variants status categoryId sellerProfileId")
        .session(session)
        .lean();

    const categoryQuery = Category.find({
        _id: { $in: products.map((product) => product.categoryId) },
    })
        .select("name slug status parentId")
        .session(session)
        .lean();

    const sellerQuery = SellerProfile.find({
        _id: { $in: products.map((product) => product.sellerProfileId) },
    })
        .select("userId status")
        .session(session)
        .lean();

    // Transaction reads stay sequential.
    const [categories, sellers] = session
        ? [await categoryQuery, await sellerQuery]
        : await Promise.all([categoryQuery, sellerQuery]);

    const parentQuery = Category.find({
        _id: {
            $in: categories.map((category) => category.parentId).filter(Boolean),
        },
    })
        .select("status parentId")
        .session(session)
        .lean();

    const accountQuery = User.find({
        _id: { $in: sellers.map((seller) => seller.userId) },
    })
        .select("role status")
        .session(session)
        .lean();

    const [parents, accounts] = session
        ? [await parentQuery, await accountQuery]
        : await Promise.all([parentQuery, accountQuery]);

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

        const variant = product?.variants.find((entry) => entry.variantId === reference.variantId);

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
                ? Math.max(0, variant.stock - (variant.reservedQuantity ?? 0))
                : 0;

        const pricePaise = validPrice ? variant.pricePaise : 0;
        const mrpPaise = validPrice ? variant.mrpPaise : 0;

        const available = listed && validPrice && reference.quantity <= stock;

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
        discountPaise += (mrpPaise - pricePaise) * reference.quantity;

        return {
            quantity: reference.quantity,
            product: {
                _id: keyOf(reference),
                productId,
                variantId: reference.variantId,
                sellerProfileId: String(product?.sellerProfileId || ""),
                sku: variant?.sku || "",
                images: (product?.images || []).map((image) => image.url),
                pricePaise,
                mrpPaise,
                name: product?.name || "Unavailable product",
                brand: product?.brand || "",
                category: category?.slug || "",
                variantLabel: variant?.label || "",
                packLabel: "",
                coverImage: product?.images[0]?.url || "",
                image: product?.images[0]?.url || product?.images[variant?.imageIndex]?.url || "",
                price: pricePaise / 100,
                mrp: mrpPaise / 100,
                stock,
                validPrice,
                availableForPurchase: listed && validPrice && stock > 0,
                issue,
                selectedOptions: { option: reference.variantId },
            },
            available,
        };
    });

    return {
        items,
        cartCount: references.reduce((total, item) => total + item.quantity, 0),
        subtotal: subtotalPaise / 100,
        discount: discountPaise / 100,
        canCheckout: items.length > 0 && items.every((item) => item.available),
    };
}

exports.buildCart = buildCart;

async function prepareQuote(userId, values, session = null) {
    const cart = await Cart.findOne({ userId }).session(session).lean();

    const book = await Address.findOne({ userId }).session(session).lean();

    const address = book?.addresses.find((item) => String(item._id) === values.addressId);

    if (!address || String(book.selectedId) !== values.addressId) {
        throw new ExpressError(409, "Your selected address changed. Review checkout again.");
    }

    if (!cart?.items.length) {
        throw new ExpressError(400, "Your cart is empty.");
    }

    const catalogue = await buildCart(cart.items, session);

    if (!catalogue.canCheckout) {
        throw new ExpressError(409, "Cart availability changed. Review your cart.");
    }

    const items = catalogue.items.map(({ product, quantity }) => ({
        productId: product.productId,
        variantId: product.variantId,
        sellerProfileId: product.sellerProfileId,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        variantLabel: product.variantLabel,
        images: product.images,
        image: product.coverImage,
        quantity,
        pricePaise: product.pricePaise,
        mrpPaise: product.mrpPaise,
    }));

    const products = await Product.find({ _id: { $in: items.map((item) => item.productId) } })
        .select("categoryId")
        .session(session)
        .lean();
    const categories = await require("../models/Category")
        .find({ _id: { $in: products.map((item) => item.categoryId) } })
        .session(session)
        .lean();
    for (const item of items) {
        const product = products.find((row) => String(row._id) === String(item.productId));
        const category = categories.find((row) => String(row._id) === String(product?.categoryId));
        item.replacementPolicy = {
            allowed: Boolean(category?.replacementAllowed),
            days: category?.replacementDays || 0,
        };
    }

    const sellers = await require("../models/SellerProfile")
        .find({
            _id: { $in: items.map((item) => item.sellerProfileId) },
        })
        .session(session)
        .lean();
    const deliveryUsers = await require("../models/User")
        .find({ role: "delivery", status: "Active" })
        .select("_id")
        .session(session)
        .lean();
    for (const seller of sellers) {
        const covered = await require("../models/DeliveryAgentProfile")
            .exists({
                status: "Active",
                userId: { $in: deliveryUsers.map((user) => user._id) },
                pincodes: { $all: [seller.pickupAddress?.pincode, address.pincode] },
            })
            .session(session);
        if (!covered)
            throw new ExpressError(
                409,
                "Delivery is not available for this address and seller. Choose another address or remove the affected items."
            );
    }

    const pricing = await require("./pricingService").quote(
        items,
        values.couponCode,
        userId,
        session
    );

    const snapshot = {
        items,
        address,
        pricing,
        cartVersion: cart.__v,
    };

    const quoteToken = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

    return { ...snapshot, quoteToken };
}

exports.quoteCheckout = async (userId, values) => {
    const quote = await prepareQuote(userId, values);

    return {
        quoteToken: quote.quoteToken,
        pricing: displayPricing(quote.pricing),
    };
};

exports.reserveCheckout = async (userId, values) => {
    const checkExisting = (order) => {
        if (order.quoteToken !== values.quoteToken) {
            throw new ExpressError(
                409,
                "This checkout reference belongs to different checkout details."
            );
        }

        return order;
    };

    try {
        return await mongoose.connection.transaction(async (session) => {
            const existing = await Order.findOne({
                userId,
                attemptId: values.attemptId,
            }).session(session);

            if (existing) return checkExisting(existing);

            if (
                await Order.exists({
                    userId,
                    active: true,
                }).session(session)
            ) {
                throw new ExpressError(
                    409,
                    "A checkout is already pending. Resume it before starting another."
                );
            }

            const quote = await prepareQuote(userId, values, session);

            if (quote.quoteToken !== values.quoteToken) {
                throw new ExpressError(
                    409,
                    "Prices, images, address or cart changed. Review checkout again."
                );
            }

            // Serialize checkout against concurrent cart changes.
            const cart = await Cart.updateOne(
                { userId, __v: quote.cartVersion },
                { $inc: { __v: 1 } },
                { session }
            );

            if (!cart.matchedCount) {
                throw new ExpressError(409, "Your cart changed. Review it again.");
            }

            for (const item of quote.items) {
                const product = await Product.findById(item.productId).session(session);

                const variant = product?.variants.find(
                    (entry) => entry.variantId === item.variantId
                );

                if (!variant || variant.stock - variant.reservedQuantity < item.quantity) {
                    throw new ExpressError(
                        409,
                        "Available stock changed. Please review your cart."
                    );
                }

                const changed = await Product.updateOne(
                    { _id: product._id, __v: product.__v },
                    {
                        $inc: {
                            "variants.$[item].reservedQuantity": item.quantity,
                            __v: 1,
                        },
                    },
                    {
                        session,
                        arrayFilters: [{ "item.variantId": item.variantId }],
                    }
                );

                if (!changed.matchedCount) {
                    throw new ExpressError(409, "Stock changed. Please retry.");
                }
            }

            await require("./pricingService").reserve(quote.pricing.appliedCoupon, session);

            const [order] = await Order.create(
                [
                    {
                        ...quote,
                        couponReserved: Boolean(quote.pricing.appliedCoupon),
                        cartVersion: quote.cartVersion + 1,
                        userId,
                        attemptId: values.attemptId,
                        expiresAt: new Date(Date.now() + RESERVATION_MS),
                    },
                ],
                { session }
            );

            await Payment.create([{ orderId: order._id }], { session });

            return order;
        });
    } catch (error) {
        if (error.code === 11000) {
            const existing = await Order.findOne({
                userId,
                attemptId: values.attemptId,
            });

            if (existing) return checkExisting(existing);

            throw new ExpressError(409, "Another checkout is pending. Resume it first.");
        }

        throw error;
    }
};
