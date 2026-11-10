const Joi = require("joi");

const Order = require("../models/Order");
const checkout = require("../services/checkoutService");
const payment = require("../services/payment/paymentService");
const ExpressError = require("../utils/ExpressError");

function validate(body, starting = false) {
    const { value, error } = Joi.object({
        addressId: Joi.string().hex().length(24).required(),
        couponCode: Joi.string()
            .trim()
            .uppercase()
            .max(30)
            .allow("")
            .default(""),
        ...(starting
            ? {
                  quoteToken: Joi.string().hex().length(64).required(),
                  attemptId: Joi.string()
                      .guid({ version: "uuidv4" })
                      .required(),
              }
            : {}),
    }).validate(body);

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }

    return value;
}

exports.quote = async (req, res, next) => {
    try {
        res.json(
            await checkout.quoteCheckout(
                req.user._id,
                validate(req.body)
            )
        );
    } catch (error) {
        next(error);
    }
};

exports.start = async (req, res, next) => {
    try {
        const order = await checkout.reserveCheckout(
            req.user._id,
            validate(req.body, true)
        );

        try {
            await payment.synchronizePayment(order._id);
        } catch {
            // The saved attempt is recovered by reconciliation.
        }

        res.json(
            await payment.checkoutStatus(req.user._id, order._id)
        );
    } catch (error) {
        next(error);
    }
};

exports.active = async (req, res, next) => {
    try {
        let order = await Order.findOne({
            userId: req.user._id,
            active: true,
        }).select("_id");

        if (
            !order &&
            typeof req.query.attemptId === "string" &&
            /^[a-f0-9-]{36}$/i.test(req.query.attemptId)
        ) {
            order = await Order.findOne({
                userId: req.user._id,
                attemptId: req.query.attemptId,
            }).select("_id");
        }

        res.json(
            order
                ? await payment.checkoutStatus(
                      req.user._id,
                      order._id
                  )
                : { order: null, checkout: null }
        );
    } catch (error) {
        next(error);
    }
};