const Joi = require("joi");
const mongoose = require("mongoose");

const Address = require("../models/Address");
const ExpressError = require("../utils/ExpressError");

const fields = {
    name: Joi.string().trim().min(2).max(80).required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    pincode: Joi.string().pattern(/^[1-9]\d{5}$/).required(),
    house: Joi.string().trim().min(2).max(150).required(),
    area: Joi.string().trim().min(2).max(150).required(),
    city: Joi.string().trim().min(2).max(80).required(),
    state: Joi.string().trim().min(2).max(80).required(),
    landmark: Joi.string().trim().max(150).allow("").default(""),
    type: Joi.string().valid("Home", "Work", "Other").required(),
};

const signature = (address) =>
    Object.keys(fields)
        .map((key) =>
            String(address[key] || "").trim().toLowerCase()
        )
        .join("|");

function response(book, addressId = null) {
    return {
        addresses: book.addresses.map((entry) => ({
            ...Object.fromEntries(
                Object.keys(fields).map((key) => [key, entry[key]])
            ),
            id: String(entry._id),
        })),
        selectedId: book.selectedId
            ? String(book.selectedId)
            : null,
        version: book.__v,
        addressId: addressId ? String(addressId) : null,
    };
}

async function getBook(userId) {
    const existing = await Address.findOne({ userId }).lean();

    if (existing) return existing;

    try {
        return (await Address.create({ userId })).toObject();
    } catch (error) {
        if (error.code !== 11000) throw error;

        return Address.findOne({ userId }).lean();
    }
}

exports.getAddresses = async (req, res, next) => {
    try {
        const book = await getBook(req.user._id);

        res.json({
            success: true,
            addressBook: response(book),
        });
    } catch (error) {
        next(error);
    }
};

// Keep address changes and selection in one versioned document.
exports.changeAddress = (action) => async (req, res, next) => {
    try {
        const schema = Joi.object({
            version: Joi.number().integer().min(0).required(),

            ...(["create", "update"].includes(action)
                ? {
                      ...fields,
                      select: Joi.boolean().default(false),
                  }
                : {}),
        });

        const { value, error } = schema.validate(req.body, {
            allowUnknown: false,
        });

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        const id = req.params.addressId;

        if (
            action !== "create" &&
            !mongoose.isObjectIdOrHexString(id)
        ) {
            throw new ExpressError(400, "Invalid address ID.");
        }

        const book = await getBook(req.user._id);

        if (book.__v !== value.version) {
            throw new ExpressError(
                409,
                "Your addresses changed. Refresh and try again."
            );
        }

        const { version, select, ...details } = value;

        let changedId = id;
        let addresses = book.addresses;
        let selectedId = book.selectedId;

        const index = addresses.findIndex(
            (entry) => String(entry._id) === id
        );

        if (action !== "create" && index < 0) {
            throw new ExpressError(404, "Address not found.");
        }

        if (action === "create") {
            const duplicate = addresses.find(
                (entry) => signature(entry) === signature(details)
            );

            if (duplicate) {
                if (!select) {
                    return res.json({
                        success: true,
                        addressBook: response(book, duplicate._id),
                    });
                }

                changedId = duplicate._id;
            } else {
                if (addresses.length >= 20) {
                    throw new ExpressError(
                        400,
                        "You can save up to 20 addresses."
                    );
                }

                changedId = new mongoose.Types.ObjectId();

                addresses = [
                    ...addresses,
                    { _id: changedId, ...details },
                ];

                if (!selectedId) selectedId = changedId;
            }
        } else if (action === "update") {
            addresses = addresses.map((entry, position) =>
                position === index
                    ? { ...entry, ...details }
                    : entry
            );
        } else if (action === "delete") {
            addresses = addresses.filter(
                (_, position) => position !== index
            );

            if (String(selectedId) === id) {
                selectedId = addresses[0]?._id || null;
            }
        } else if (action === "default") {
            selectedId = addresses[index]._id;
        }

        // Checkout saves the address and selection together.
        if (select) selectedId = changedId;

        const updated = await Address.findOneAndUpdate(
            {
                _id: book._id,
                userId: req.user._id,
                __v: version,
            },
            {
                $set: { addresses, selectedId },
                $inc: { __v: 1 },
            },
            { 
                new: true, 
                runValidators: true 
            }
        ).lean();

        if (!updated) {
            throw new ExpressError(
                409,
                "Your addresses changed. Refresh and try again."
            );
        }

        res.json({
            success: true,
            addressBook: response(updated, changedId),
        });
    } catch (error) {
        next(error);
    }
};