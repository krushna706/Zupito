const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");
const Joi = require("joi");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const DeliveryAgentProfile = require("../models/DeliveryAgentProfile");
const DeliveryTask = require("../models/DeliveryTask");
const Order = require("../models/Order");
const SellerOrder = require("../models/SellerOrder");
const ExpressError = require("../utils/ExpressError");
const deliveryService = require("../services/deliveryService");
const assignmentService = require("../services/assignmentService");

// ================== VALIDATION ==================
const agentSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    mobile: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required(),
    pincodes: Joi.array()
        .items(Joi.string().pattern(/^[1-9]\d{5}$/))
        .min(1)
        .max(15)
        .unique()
        .required(),
    capacity: Joi.number().integer().min(1).max(20).required(),
    availability: Joi.string().valid("Available", "Unavailable").required(),
});

const statusSchema = Joi.object({
    status: Joi.string().valid("Active", "Suspended"),
    availability: Joi.string().valid("Available", "Unavailable"),
    reason: Joi.string().trim().max(300).allow(""),
}).or("status", "availability");

const assignmentSchema = Joi.object({
    agentId: Joi.string().hex().length(24).required(),
    custodyConfirmed: Joi.boolean().default(false),
});

const actionSchema = Joi.object({
    action: Joi.string()
        .valid("pickup", "start_delivery", "regenerate_otp", "deliver", "failed", "retry")
        .required(),
    confirmed: Joi.boolean(),
    otp: Joi.string().pattern(/^\d{6}$/),
    reason: Joi.string().valid(
        "Customer unavailable",
        "Incorrect address",
        "Customer requested reschedule",
        "Pickup location unavailable",
        "Vehicle issue",
        "Customer refused delivery",
        "Other"
    ),
    note: Joi.string().trim().max(200).allow(""),
});

function validate(schema, input) {
    const { error, value } = schema.validate(input, {
        abortEarly: false,
        allowUnknown: false,
    });

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }

    return value;
}

function assertId(id) {
    if (!mongoose.isObjectIdOrHexString(id)) {
        throw new ExpressError(400, "Invalid record ID.");
    }
}

// ================== AGENT RESPONSE ==================
async function publicAgent(profile) {
    const user = await User.findById(profile.userId).select("name email phone").lean();

    return {
        id: String(profile._id),
        userId: String(profile.userId),
        name: user?.name || "Agent",
        email: user?.email || "",
        mobile: user?.phone || "",
        pincodes: profile.pincodes,
        capacity: profile.capacity,
        activeTasks: profile.activeTasks,
        completedTasks: profile.completedTasks,
        availability: profile.availability,
        status: profile.status,
        remarks: profile.remarks,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
}

// ================== ORDERED PARCEL ITEMS ==================
// Only return items belonging to this seller parcel.
async function serializeTasks(tasks) {
    const replacements = await require("../models/Replacement")
        .find({ _id: { $in: tasks.map((task) => task.replacementId).filter(Boolean) } })
        .lean();
    const replacementMap = new Map(replacements.map((row) => [String(row._id), row]));
    if (!tasks.length) return [];

    const [orders, parcels] = await Promise.all([
        Order.find({
            _id: {
                $in: tasks.map((task) => task.orderId),
            },
        })
            .select("_id items")
            .lean(),

        SellerOrder.find({
            _id: {
                $in: tasks.map((task) => task.sellerOrderId),
            },
        })
            .select("_id itemIndexes")
            .lean(),
    ]);

    const orderById = new Map(orders.map((order) => [String(order._id), order]));

    const parcelById = new Map(parcels.map((parcel) => [String(parcel._id), parcel]));

    return tasks.map((task) => {
        const order = orderById.get(String(task.orderId));

        const parcel = parcelById.get(String(task.sellerOrderId));

        // Use the checkout snapshot, not current stock.
        const replacement = replacementMap.get(String(task.replacementId));
        const items = (replacement ? [replacement.itemIndex] : parcel?.itemIndexes || [])
            .map((index) => {
                const item = order?.items?.[index];

                if (!item) return null;

                return {
                    id: `${item.productId}:${item.variantId || index}`,
                    name: item.name || "Product",
                    brand: item.brand || "",
                    image: item.image || "",
                    variantLabel: item.variantLabel || "",
                    sku: item.sku || "",
                    quantity: Number(replacement?.quantity || item.quantity || 0),
                };
            })
            .filter(Boolean);

        return {
            ...deliveryService.taskResponse(task),
            items,
            productCount: items.length,
            totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
        };
    });
}

// ================== ADMIN: AGENTS ==================
exports.agents = async (req, res, next) => {
    try {
        const profiles = await DeliveryAgentProfile.find()
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        res.json({
            agents: await Promise.all(profiles.map(publicAgent)),
        });
    } catch (error) {
        next(error);
    }
};

// ================== CREATE / EDIT AGENT ==================
exports.saveAgent = async (req, res, next) => {
    try {
        const data = validate(agentSchema, req.body);
        const agentId = req.params.agentId;

        if (agentId) assertId(agentId);

        const profile = await mongoose.connection.transaction(async (session) => {
            if (!agentId) {
                // Password is set through existing Forgot Password OTP.
                const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

                const [user] = await User.create(
                    [
                        {
                            name: data.name,
                            email: data.email,
                            phone: data.mobile,
                            passwordHash,
                            role: "delivery",
                            status: "Active",
                        },
                    ],
                    { session }
                );

                const [created] = await DeliveryAgentProfile.create(
                    [
                        {
                            userId: user._id,
                            pincodes: data.pincodes,
                            capacity: data.capacity,
                            availability: data.availability,
                        },
                    ],
                    { session }
                );

                return created;
            }

            const existing = await DeliveryAgentProfile.findById(agentId).session(session);

            if (!existing) {
                throw new ExpressError(404, "Delivery agent not found.");
            }

            if (data.capacity < existing.activeTasks) {
                throw new ExpressError(409, "Capacity cannot be below the current workload.");
            }

            const updated = await User.updateOne(
                {
                    _id: existing.userId,
                    role: "delivery",
                },
                {
                    $set: {
                        name: data.name,
                        email: data.email,
                        phone: data.mobile,
                    },
                },
                {
                    session,
                    runValidators: true,
                }
            );

            if (!updated.matchedCount) {
                throw new ExpressError(409, "Linked delivery account is unavailable.");
            }

            existing.pincodes = data.pincodes;
            existing.capacity = data.capacity;
            existing.availability = data.availability;

            await existing.save({ session });

            return existing;
        });

        res.status(agentId ? 200 : 201).json({
            agent: await publicAgent(profile),
        });
    } catch (error) {
        next(error);
    }
};

// ================== AGENT ACCOUNT STATUS ==================
exports.updateAgentStatus = async (req, res, next) => {
    try {
        assertId(req.params.agentId);

        const data = validate(statusSchema, req.body);

        if (data.status === "Suspended" && (!data.reason || data.reason.length < 5)) {
            throw new ExpressError(400, "Suspension reason must contain at least 5 characters.");
        }

        const profile = await mongoose.connection.transaction(async (session) => {
            const agent = await DeliveryAgentProfile.findById(req.params.agentId).session(session);

            if (!agent) {
                throw new ExpressError(404, "Delivery agent not found.");
            }

            if (data.availability) {
                agent.availability = data.availability;
            }

            if (data.status) {
                agent.status = data.status;
                agent.remarks = data.status === "Suspended" ? data.reason : "";

                const changed = await User.updateOne(
                    {
                        _id: agent.userId,
                        role: "delivery",
                    },
                    {
                        $set: {
                            status: data.status === "Active" ? "Active" : "Inactive",
                        },
                        $inc: {
                            tokenVersion: 1,
                        },
                    },
                    { session }
                );

                if (!changed.matchedCount) {
                    throw new ExpressError(409, "Linked delivery account is unavailable.");
                }

                // Revoke sessions; preserve login history.
                await AuthSession.updateMany(
                    {
                        userId: agent.userId,
                        revokedAt: null,
                    },
                    {
                        $set: {
                            revokedAt: new Date(),
                            revokeReason: "admin_action",
                        },
                    },
                    { session }
                );
            }

            await agent.save({ session });

            return agent;
        });

        res.json({
            agent: await publicAgent(profile),
        });
    } catch (error) {
        next(error);
    }
};

// ================== ADMIN ASSIGNMENTS ==================
exports.assignments = async (req, res, next) => {
    try {
        const tasks = await DeliveryTask.find().sort({ createdAt: -1 }).limit(500).lean();

        res.json({
            tasks: await serializeTasks(tasks),
        });
    } catch (error) {
        next(error);
    }
};

exports.autoAssign = async (req, res, next) => {
    try {
        await assignmentService.assignPending();

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.assign = async (req, res, next) => {
    try {
        assertId(req.params.taskId);

        const input = validate(assignmentSchema, req.body);

        const task = await assignmentService.assign(
            req.params.taskId,
            input.agentId,
            req.user._id,
            input.custodyConfirmed
        );

        res.json({
            task: (await serializeTasks([task]))[0],
        });
    } catch (error) {
        next(error);
    }
};

// ================== DELIVERY AGENT ACCESS ==================
async function activeAgent(userId) {
    const profile = await DeliveryAgentProfile.findOne({
        userId,
        status: "Active",
    });

    if (!profile) {
        throw new ExpressError(403, "Active delivery-agent account required.");
    }

    return profile;
}

exports.me = async (req, res, next) => {
    try {
        const profile = await activeAgent(req.user._id);

        res.json({
            agent: await publicAgent(profile),
        });
    } catch (error) {
        next(error);
    }
};

// ================== MY TASKS ==================
exports.myTasks = async (req, res, next) => {
    try {
        const agent = await activeAgent(req.user._id);

        const tasks = await DeliveryTask.find({
            agentProfileId: agent._id,
        })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        res.json({
            tasks: await serializeTasks(tasks),
        });
    } catch (error) {
        next(error);
    }
};

// ================== SINGLE TASK ==================
exports.myTask = async (req, res, next) => {
    try {
        assertId(req.params.taskId);

        const agent = await activeAgent(req.user._id);

        const task = await DeliveryTask.findOne({
            _id: req.params.taskId,
            agentProfileId: agent._id,
        });

        if (!task) {
            throw new ExpressError(404, "Assigned task not found.");
        }

        res.json({
            task: (await serializeTasks([task]))[0],
        });
    } catch (error) {
        next(error);
    }
};

// ================== DELIVERY ACTIONS ==================
exports.perform = async (req, res, next) => {
    try {
        assertId(req.params.taskId);

        const input = validate(actionSchema, req.body);

        const task = await deliveryService.action(
            req.user._id,
            req.params.taskId,
            input.action,
            input
        );

        res.json({ task });
    } catch (error) {
        next(error);
    }
};

// ================== AGENT AVAILABILITY ==================
exports.changeAvailability = async (req, res, next) => {
    try {
        const { availability } = validate(
            Joi.object({
                availability: Joi.string().valid("Available", "Unavailable").required(),
            }),
            req.body
        );

        const agent = await DeliveryAgentProfile.findOneAndUpdate(
            {
                userId: req.user._id,
                status: "Active",
            },
            {
                $set: {
                    availability,
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!agent) {
            throw new ExpressError(403, "Active delivery-agent account required.");
        }

        res.json({
            agent: await publicAgent(agent),
        });
    } catch (error) {
        next(error);
    }
};

// Admin can recover an OTP lock without seeing the code or changing custody.
exports.recoverOtp = async (req, res, next) => {
    try {
        assertId(req.params.taskId);
        const { reason } = validate(
            Joi.object({ reason: Joi.string().trim().min(5).max(200).required() }),
            req.body
        );
        await mongoose.connection.transaction(async (session) => {
            const task = await DeliveryTask.findOne({
                _id: req.params.taskId,
                stage: { $in: ["assigned", "out_for_delivery"] },
            })
                .select("+otpHash +otpCiphertext")
                .session(session);
            if (!task)
                throw new ExpressError(
                    409,
                    "Only an active pickup or delivery code can be recovered."
                );
            if (task.otpIssuedAt && Date.now() - task.otpIssuedAt.getTime() < 60000) {
                throw new ExpressError(429, "Wait 60 seconds before recovering the code.");
            }
            require("../services/deliveryOtpService").issue(
                task,
                task.stage === "assigned" ? "pickup" : "delivery"
            );
            task.otpRegenerations = 0;
            task.events.push({ actorUserId: req.user._id, note: `Admin recovered OTP: ${reason}` });
            await task.save({ session });
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
