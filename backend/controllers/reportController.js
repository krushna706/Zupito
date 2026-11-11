const mongoose = require("mongoose");
const BackgroundJob = require("../models/BackgroundJob");
const SellerOrder = require("../models/SellerOrder");
const User = require("../models/User");

// Admin-only operational snapshot. Explicit projections keep secrets out of reports.
exports.snapshot = async (req, res, next) => {
    try {
        const definitions = {
            sellers: ["SellerProfile", "storeName status createdAt userId pickupAddress"],
            customers: ["User", "name email status createdAt role", { role: "customer" }],
            agents: [
                "DeliveryAgentProfile",
                "userId status availability activeTasks completedTasks capacity createdAt",
            ],
            categories: ["Category", "name parentId status createdAt"],
            products: ["Product", "name sellerProfileId categoryId status variants createdAt"],
            orders: ["Order", "status items pricing address.name createdAt confirmedAt"],
            assignments: [
                "DeliveryTask",
                "stage kind attempts createdAt deliveredAt assignedAt seller orderId",
            ],
            payments: ["Payment", "status orderId amountPaise createdAt providerPaymentId"],
            refunds: ["Refund", "status orderId amountPaise reason createdAt"],
            replacements: [
                "Replacement",
                "status orderId item.name quantity createdAt sellerProfileId",
            ],
            settlements: [
                "Settlement",
                "status orderId sellerProfileId grossPaise discountPaise payablePaise commissionPaise createdAt paidAt batch",
            ],
            coupons: [
                "Coupon",
                "code enabled type value maxDiscount validFrom validUntil usageCount usageLimit createdAt",
            ],
            reviews: ["Review", "rating status createdAt productId"],
            complaints: ["Complaint", "status category createdAt"],
        };
        const entries = await Promise.all(
            Object.entries(definitions).map(async ([key, [model, fields, filter = {}]]) => {
                const rows = await require(`../models/${model}`)
                    .find(filter)
                    .select(fields)
                    .sort({ createdAt: -1 })
                    .limit(5000)
                    .lean();
                return [
                    key,
                    rows.map((row) => ({
                        ...row,
                        id: String(row._id),
                        ...(key === "orders"
                            ? {
                                  totalAmount: row.pricing?.total / 100,
                                  paymentStatus: row.status === "Confirmed" ? "Paid" : row.status,
                              }
                            : {}),
                        ...(["payments", "refunds"].includes(key)
                            ? { amount: (row.amountPaise || 0) / 100 }
                            : {}),
                        ...(key === "settlements"
                            ? {
                                  netPayable: row.payablePaise / 100,
                                  commission: row.commissionPaise / 100,
                              }
                            : {}),
                    })),
                ];
            })
        );
        const snapshot = Object.fromEntries(entries);
        const parcels = await SellerOrder.find({
            orderId: { $in: snapshot.orders.map((row) => row._id) },
        })
            .select("orderId status")
            .lean();
        const users = await User.find({ _id: { $in: snapshot.agents.map((row) => row.userId) } })
            .select("name")
            .lean();
        const ordersById = new Map(snapshot.orders.map((row) => [row.id, row]));
        const sellersById = new Map(snapshot.sellers.map((row) => [row.id, row]));
        const categoriesById = new Map(snapshot.categories.map((row) => [row.id, row]));
        const usersById = new Map(users.map((row) => [String(row._id), row]));
        const parcelsByOrder = new Map();
        for (const parcel of parcels) {
            const key = String(parcel.orderId);
            if (!parcelsByOrder.has(key)) parcelsByOrder.set(key, []);
            parcelsByOrder.get(key).push(parcel);
        }

        for (const order of snapshot.orders) {
            const rows = parcelsByOrder.get(order.id) || [];
            const active = rows.filter((row) => row.status !== "Cancelled");
            order.customerName = order.address?.name || "Customer";
            order.orderStatus = !rows.length
                ? order.status
                : !active.length
                  ? "Cancelled"
                  : active.every((row) => row.status === "Delivered")
                    ? "Delivered"
                    : active.some((row) => row.status === "Shipped")
                      ? "Shipped"
                      : "Processing";
        }
        for (const payment of snapshot.payments) {
            const order = ordersById.get(String(payment.orderId));
            payment.amount = order?.totalAmount || 0;
            payment.status =
                order?.status === "Confirmed"
                    ? "Successful"
                    : ["Expired", "Refunded"].includes(order?.status)
                      ? "Cancelled"
                      : "Pending";
            payment.gatewayPaymentId = payment.providerPaymentId;
        }
        for (const product of snapshot.products) {
            product.seller =
                sellersById.get(String(product.sellerProfileId))?.storeName || "Seller";
            product.category = categoriesById.get(String(product.categoryId))?.name || "Category";
            product.variants = product.variants.map((row) => ({
                ...row,
                price: row.pricePaise / 100,
            }));
        }
        for (const agent of snapshot.agents)
            agent.name = usersById.get(String(agent.userId))?.name || "Agent";
        for (const row of snapshot.replacements) row.productName = row.item?.name || "Product";
        for (const row of snapshot.settlements) {
            row.seller = sellersById.get(String(row.sellerProfileId))?.storeName || "Seller";
            row.gross = row.grossPaise;
            row.commission = row.commissionPaise;
            row.payable = row.payablePaise;
            row.adjustments = -row.discountPaise;
        }
        res.json({ snapshot, limit: 5000 });
    } catch (error) {
        next(error);
    }
};

// ================== BACKGROUND JOBS ==================
exports.listJobs = async (req, res, next) => {
    try {
        res.json({
            jobs: await BackgroundJob.find().select("-lockToken").lean(),
        });
    } catch (error) {
        next(error);
    }
};

// ================== RETRY FAILED JOB ==================
exports.retryJob = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id))
            return res.status(400).json({ message: "Invalid job." });
        const result = await BackgroundJob.updateOne(
            { _id: req.params.id, status: "Review" },
            {
                $set: {
                    status: "Pending",
                    attempts: 0,
                    nextRunAt: new Date(),
                    lockUntil: new Date(0),
                },
            }
        );
        if (!result.modifiedCount)
            return res.status(409).json({ message: "Job does not require recovery." });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
