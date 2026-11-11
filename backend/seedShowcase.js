
const path = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

// ================== PROJECT MODELS ==================
const modelNames = [
    "User",
    "SellerProfile",
    "DeliveryAgentProfile",
    "Address",
    "Category",
    "Product",
    "StockMovement",
    "Order",
    "SellerOrder",
    "Payment",
    "DeliveryTask",
    "Review",
    "Refund",
    "Replacement",
    "Settlement",
    "Complaint",
    "Coupon",
    "Cart",
    "AuditLog",
];

const models = Object.fromEntries(modelNames.map((name) => [name, require(`./models/${name}`)]));
const { calculatePricing } = require("./config/orderRules");
const { allocation } = require("./services/refundService");
const otp = require("./services/deliveryOtpService");

const VERSION = "zupito-showcase-v2";
const DEMO_PASSWORD = "123456";

const demoEmails = Object.freeze({
    admin: "admin@gmail.com",
    seller: "seller@gmail.com",
    delivery: "deliveryboy@gmail.com",
    customer: "coustemer@gmail.com",
});

const DAY = 86400000;
const now = Date.now();
const ago = (days) => new Date(now - days * DAY);

const id = (key) =>
    new mongoose.Types.ObjectId(
        createHash("sha256").update(`${VERSION}:${key}`).digest("hex").slice(0, 24)
    );

const markerId = id("completed");

// ================== SHOPPING CATEGORIES ==================
const groups = [
    ["Mobiles & Accessories", "smartphones", "mobile-accessories"],
    ["Electronics", "laptops", "tablets"],
    ["Men's Fashion", "mens-shirts"],
    ["Women's Fashion", "womens-dresses", "tops"],
    ["Footwear", "mens-shoes", "womens-shoes"],
    ["Watches", "mens-watches", "womens-watches"],
    ["Grocery", "groceries"],
    ["Beauty & Personal Care", "beauty", "skin-care", "fragrances"],
    ["Furniture", "furniture"],
    ["Home Decor", "home-decoration"],
    ["Kitchen & Dining", "kitchen-accessories"],
    ["Sports & Fitness", "sports-accessories"],
    ["Bags & Luggage", "womens-bags"],
    ["Jewellery", "womens-jewellery"],
    ["Eyewear", "sunglasses"],
    ["Automotive", "vehicle", "motorcycle"],
];

const subcategoryNames = {
    "smartphones": "Smartphones",
    "mobile-accessories": "Mobile Accessories",
    "laptops": "Laptops",
    "tablets": "Tablets",
    "mens-shirts": "Shirts",
    "womens-dresses": "Dresses",
    "tops": "Tops",
    "mens-shoes": "Men",
    "womens-shoes": "Women",
    "mens-watches": "Men",
    "womens-watches": "Women",
    "groceries": "Groceries",
    "beauty": "Beauty Products",
    "skin-care": "Skin Care",
    "fragrances": "Fragrances",
    "furniture": "Home Furniture",
    "home-decoration": "Home Decorations",
    "kitchen-accessories": "Kitchen Accessories",
    "sports-accessories": "Sports Accessories",
    "womens-bags": "Women's Bags",
    "womens-jewellery": "Women's Jewellery",
    "sunglasses": "Sunglasses",
    "vehicle": "Vehicles",
    "motorcycle": "Motorcycles",
};

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const departmentSlug = (name) => `department-${slugify(name)}`;

const categoryBySource = new Map(
    groups.flatMap(([parent, ...children], sellerIndex) =>
        children.map((source) => ({ source, parent, sellerIndex, name: subcategoryNames[source] }))
    ).map((entry) => [entry.source, entry])
);

assert.equal(groups.length, 16, "Expected 16 main categories.");
assert.equal(categoryBySource.size, 24, "Each source category must appear once.");

const names = [
    "Aarav",
    "Ananya",
    "Rohan",
    "Meera",
    "Kabir",
    "Diya",
    "Arjun",
    "Isha",
    "Vivaan",
    "Tara",
    "Neel",
    "Kavya",
];

const stores = [
    "Pixel Avenue",
    "Everyday Wardrobe",
    "Bloom Essentials",
    "Comfort Corner",
    "Fresh Basket",
    "Active Trail",
    "Stride Studio",
    "Sole Avenue",
    "Carry Collective",
    "Timecraft",
    "Elegant Hours",
    "Ornament House",
    "Skin Ritual",
    "Shade Studio",
    "Tablet Corner",
    "Casual Edit",
];

// ================== SAMPLE CATALOGUE ==================
async function fetchCatalogue() {
    const catalogue = [];

    for (let sellerIndex = 0; sellerIndex < groups.length; sellerIndex += 1) {
        const [parent, ...children] = groups[sellerIndex];

        for (const category of children) {
            const response = await fetch(
                `https://dummyjson.com/products/category/${category}?limit=5`,
                {
                    signal: AbortSignal.timeout(30000),
                }
            );

            if (!response.ok)
                throw new Error(`Catalogue request failed: ${category} (${response.status})`);

            const { products } = await response.json();

            if (!Array.isArray(products) || products.length < 1) {
                throw new Error(`No products returned for ${category}. Nothing has been inserted.`);
            }

            for (const product of products) {
                if (
                    !product.title ||
                    !product.description ||
                    !Number.isFinite(product.price) ||
                    product.price <= 0
                ) {
                    throw new Error(`Invalid catalogue item in ${category}.`);
                }

                const images = [
                    ...new Set([...(product.images || []), product.thumbnail].filter(Boolean)),
                ].slice(0, 4);

                if (
                    !images.length ||
                    images.some((value) => {
                        const url = new URL(value);
                        return url.protocol !== "https:" || url.hostname !== "cdn.dummyjson.com";
                    })
                )
                    throw new Error(`Unexpected image source for ${product.title}.`);

                catalogue.push({ ...product, images, category, parent, sellerIndex });
            }
        }
    }

    assert.ok(catalogue.length >= 100, "Expected at least 100 catalogue products.");
    assert.equal(new Set(catalogue.map((product) => product.id)).size, catalogue.length);

    return catalogue;
}

// ================== PRODUCT + OPENING STOCK RECORDS ==================
function buildProductRecords(catalogue, sellers, categories, add, admin) {
    return catalogue.map((source, index) => {
        // Prices are illustrative INR values, not live exchange-rate conversions.
        const pricePaise = Math.min(9999900, Math.max(9900, Math.round(source.price * 80) * 100));
        const variantId = `showcase-${source.id}-standard`;

        const product = add(
            "Product",
            `product-${source.id}`,
            {
                sellerProfileId: sellers[source.sellerIndex]._id,
                categoryId: categories.get(source.category)._id,
                productCode: `SHOWCASE-${source.id}`,
                name: source.title.slice(0, 150),
                brand: (source.brand || "Everyday Collection").slice(0, 80),
                description: source.description.slice(0, 5000),
                highlights: [
                    "Carefully packed for delivery",
                    "See the selected item and pack details before ordering",
                ],
                specifications: [
                    {
                        label: "Category",
                        value: `${categoryBySource.get(source.category).parent} > ${subcategoryNames[source.category]}`,
                    },
                    { label: "Pack", value: "1 unit" },
                ],
                images: source.images.map((url, imageIndex) => ({
                    url,
                    publicId: `showcase-external/${source.id}/${imageIndex}`,
                })),
                variants: [
                    {
                        variantId,
                        sku: `SHOWCASE-${source.id}`,
                        label: "Standard / 1 unit",
                        pricePaise,
                        mrpPaise: Math.ceil((pricePaise * 1.15) / 100) * 100,
                        stock: 80,
                        reservedQuantity: 0,
                        imageIndex: 0,
                    },
                ],
                status: index >= catalogue.length - 4 ? "Pending" : "Approved",
                reviewedAt: index >= catalogue.length - 4 ? null : ago(55),
                reviewedById: index >= catalogue.length - 4 ? null : admin._id,
                ratingCount: 0,
                ratingSum: 0,
            },
            index >= catalogue.length - 4 ? ago(1) : ago(55)
        );

        add(
            "StockMovement",
            `opening-${source.id}`,
            {
                sellerProfileId: product.sellerProfileId,
                productId: product._id,
                variantId,
                sku: product.variants[0].sku,
                type: "Opening",
                beforeQuantity: 0,
                quantityChange: 80,
                afterQuantity: 80,
                reason: "Showcase opening stock",
                actorUserId: sellers[source.sellerIndex].userId,
                operationKey: `showcase-opening-${source.id}`,
                source: "product_form",
            },
            product.createdAt
        );

        return product;
    });
}

// ================== BUILD CONNECTED RECORDS ==================
async function buildPlan(catalogue, password, excludedCodes = new Set()) {
    const newCatalogue = catalogue.filter((source) => !excludedCodes.has(`SHOWCASE-${source.id}`));

    if (newCatalogue.length < 8)
        throw new Error("Fewer than eight new catalogue products remain. No records changed.");

    const rows = Object.fromEntries(modelNames.map((name) => [name, []]));

    function add(model, key, data, date = ago(60)) {
        const row = { _id: id(key), ...data, createdAt: date, updatedAt: date };
        rows[model].push(row);
        return row;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    let phoneIndex = 0;

    function user(role, index, name) {
        phoneIndex += 1;

        return add("User", `${role}-${index}`, {
            name,
            email: index === 1 ? demoEmails[role] : `${role}${index}@showcase-v2.example`,
            phone: `90001${String(phoneIndex).padStart(5, "0")}`,
            passwordHash: index === 1 ? demoPasswordHash : passwordHash,
            role,
            status: "Active",
        });
    }

    const admin = user("admin", 1, "Showcase Administrator");
    const customers = names.map((name, index) => user("customer", index + 1, `${name} Sharma`));

    const sellers = stores.map((storeName, index) => {
        const owner = user("seller", index + 1, `${names[index % names.length]} Patel`);

        return add("SellerProfile", `store-${index}`, {
            userId: owner._id,
            storeName,
            storeEmail: owner.email,
            storePhone: owner.phone,
            description: `A curated collection from ${storeName}.`,
            status: "Approved",
            reviewedById: admin._id,
            reviewedAt: ago(59),
            pickupAddress: {
                street: `Unit ${index + 1}, Showcase Plaza`,
                locality: "Patia",
                city: "Bhubaneswar",
                state: "Odisha",
                pincode: "751024",
            },
        });
    });

    const agents = Array.from({ length: 4 }, (_, index) => {
        const owner = user("delivery", index + 1, `${names[index + 6]} Das`);

        return add("DeliveryAgentProfile", `agent-${index}`, {
            userId: owner._id,
            pincodes: ["751024", "751001", "751003"],
            capacity: 10,
            activeTasks: 0,
            completedTasks: 0,
            status: "Active",
            availability: "Available",
        });
    });

    const books = customers.map((customer, index) => {
        const address = {
            _id: id(`address-${index}`),
            name: customer.name,
            phone: customer.phone,
            house: `Apartment ${index + 101}, Sample Residency`,
            area: "Patia",
            city: "Bhubaneswar",
            state: "Odisha",
            pincode: "751024",
            type: "Home",
        };

        return add("Address", `book-${index}`, {
            userId: customer._id,
            addresses: [address],
            selectedId: address._id,
        });
    });

    const categories = new Map();

    groups.forEach(([parent, ...children], index) => {
        const cover = catalogue.find((product) => product.parent === parent).images[0];

        const main = add("Category", `category-${parent}`, {
            name: parent,
            nameKey: parent.toLowerCase(),
            slug: departmentSlug(parent),
            parentId: null,
            sortOrder: index + 1,
            showOnHome: true,
            image: { url: cover, publicId: "" },
            status: "Active",
            createdById: admin._id,
            updatedById: admin._id,
        });

        children.forEach((slug, position) => {
            const name = subcategoryNames[slug];

            const category = add("Category", `subcategory-${slug}`, {
                name,
                nameKey: name.toLowerCase(),
                slug,
                parentId: main._id,
                sortOrder: position + 1,
                replacementAllowed: slug !== "groceries",
                replacementDays: slug === "groceries" ? 0 : 7,
                status: "Active",
                createdById: admin._id,
                updatedById: admin._id,
            });

            categories.set(slug, category);
        });
    });

    const products = buildProductRecords(newCatalogue, sellers, categories, add, admin);

    const reviews = [
        "Arrived well packed and matched the listing.",
        "Good quality for everyday use. Delivery was on time.",
        "The product matched my expectations and was easy to use.",
        "Packaging could be better, but the item arrived safely.",
    ];

    const approvedProducts = products.filter((product) => product.status === "Approved");

    for (let index = 0; index < 96; index += 1) {
        const customer = customers[index % customers.length];

        const chosen = [
            approvedProducts[index % approvedProducts.length],
            approvedProducts[
                (index + Math.ceil(approvedProducts.length / 2)) % approvedProducts.length
            ],
        ];

        const cancelled = index >= 88;
        const delivered = index < 72;

        const createdAt =
            index < 8 ? ago(45 - index) : index < 72 ? ago(6 - (index - 8) * 0.04) : ago(0.5);

        const step = (hours) => new Date(createdAt.getTime() + hours * 3600000);

        const items = chosen.map((product, itemIndex) => {
            const variant = product.variants[0];

            return {
                productId: String(product._id),
                sellerProfileId: String(product.sellerProfileId),
                variantId: variant.variantId,
                sku: variant.sku,
                name: product.name,
                brand: product.brand,
                image: product.images[0].url,
                variantLabel: variant.label,
                quantity: itemIndex === 0 && index % 3 === 0 ? 2 : 1,
                pricePaise: variant.pricePaise,
                mrpPaise: variant.mrpPaise,
                replacementPolicy: { allowed: true, days: 7 },
            };
        });

        items.forEach((item, itemIndex) => {
            const category = rows.Category.find(
                (row) => String(row._id) === String(chosen[itemIndex].categoryId)
            );

            item.replacementPolicy = {
                allowed: category.replacementAllowed,
                days: category.replacementDays,
            };
        });

        const order = add(
            "Order",
            `order-${index}`,
            {
                userId: customer._id,
                attemptId: `showcase-${index}`,
                quoteToken: createHash("sha256").update(JSON.stringify(items)).digest("hex"),
                cartVersion: 0,
                items,
                address: books[index % books.length].addresses[0],
                pricing: calculatePricing(items),
                status: "Confirmed",
                active: false,
                reserved: false,
                cartCleared: true,
                confirmedAt: step(0.1),
                expiresAt: step(0.5),
            },
            createdAt
        );

        // No invented Razorpay IDs or provider calls for historical sample records.
        add(
            "Payment",
            `payment-${index}`,
            { orderId: order._id, nextCheckAt: null, creationStarted: false },
            step(0.1)
        );

        const grouped = new Map();

        items.forEach((item, itemIndex) => {
            if (!grouped.has(item.sellerProfileId)) grouped.set(item.sellerProfileId, []);
            grouped.get(item.sellerProfileId).push(itemIndex);
        });

        for (const [sellerId, indexes] of grouped) {
            const seller = sellers.find((row) => String(row._id) === sellerId);

            const parcel = add(
                "SellerOrder",
                `parcel-${index}-${sellerId}`,
                {
                    orderId: order._id,
                    sellerProfileId: seller._id,
                    itemIndexes: indexes,
                    commissionBps: 1000,
                    status: cancelled
                        ? "Cancelled"
                        : delivered
                          ? "Delivered"
                          : index < 80
                            ? "Ready for Pickup"
                            : "Shipped",
                    confirmedAt: step(0.1),
                    packingAt: step(1),
                    readyForPickupAt: step(2),
                    ...(cancelled
                        ? { cancelledAt: step(3), cancellationReason: "Ordered by mistake" }
                        : {}),
                    history: [
                        {
                            status: "Packing",
                            date: step(1),
                            actorUserId: seller.userId,
                            note: "Parcel prepared.",
                        },
                        {
                            status: "Ready for Pickup",
                            date: step(2),
                            actorUserId: seller.userId,
                            note: "Packed for collection.",
                        },
                        ...(cancelled
                            ? [
                                  {
                                      status: "Cancelled",
                                      date: step(3),
                                      actorUserId: customer._id,
                                      note: "Ordered by mistake",
                                  },
                              ]
                            : []),
                    ],
                },
                step(0.1)
            );

            const gross = indexes.reduce(
                (sum, itemIndex) => sum + items[itemIndex].pricePaise * items[itemIndex].quantity,
                0
            );

            if (!cancelled) {
                const agent = agents[rows.DeliveryTask.length % agents.length];
                const stage = delivered ? "delivered" : index < 80 ? "assigned" : "picked_up";

                const task = add(
                    "DeliveryTask",
                    `task-${parcel._id}`,
                    {
                        sellerOrderId: parcel._id,
                        orderId: order._id,
                        kind: "original",
                        operationKey: `original:${parcel._id}`,
                        agentProfileId: agent._id,
                        seller: seller.storeName,
                        product: indexes
                            .map((i) => items[i].name)
                            .join(", ")
                            .slice(0, 250),
                        pickupAddress: seller.pickupAddress,
                        customerAddress: order.address,
                        pickupPincode: "751024",
                        deliveryPincode: "751024",
                        stage,
                        custody: delivered ? "Customer" : stage === "assigned" ? "Seller" : "Agent",
                        assignmentMode: "Manual",
                        assignedAt: step(2.1),
                        ...(stage !== "assigned" ? { pickedUpAt: step(3) } : {}),
                        ...(delivered ? { outForDeliveryAt: step(4), deliveredAt: step(5) } : {}),
                        events: [
                            {
                                date: step(2.1),
                                note: "Agent assigned to parcel.",
                                actorUserId: admin._id,
                            },
                            ...(stage !== "assigned"
                                ? [
                                      {
                                          date: step(3),
                                          note: "Parcel collected from seller.",
                                          actorUserId: agent.userId,
                                      },
                                  ]
                                : []),
                            ...(delivered
                                ? [
                                      {
                                          date: step(5),
                                          note: "Delivery completed (showcase history).",
                                          actorUserId: agent.userId,
                                      },
                                  ]
                                : []),
                        ],
                    },
                    step(2)
                );

                if (stage === "assigned") otp.issue(task, "pickup");

                if (delivered) agent.completedTasks += 1;
                else agent.activeTasks += 1;

                if (index < 8) {
                    const commission = Math.round(gross * 0.1);

                    add(
                        "Settlement",
                        `settlement-${parcel._id}`,
                        {
                            orderId: order._id,
                            sellerOrderId: parcel._id,
                            sellerProfileId: seller._id,
                            batch: step(32 * 24)
                                .toISOString()
                                .slice(0, 10),
                            grossPaise: gross,
                            discountPaise: 0,
                            commissionPaise: commission,
                            payablePaise: gross - commission,
                            commissionBps: 1000,
                            status: index % 2 ? "Pending" : "Paid",
                            ...(index % 2
                                ? {}
                                : {
                                      reference: `SHOWCASE-SETTLEMENT-${index}`,
                                      paidAt: step(33 * 24),
                                      confirmedBy: admin._id,
                                  }),
                        },
                        step(32 * 24)
                    );
                }

                if (
                    index >= 68 &&
                    index < 72 &&
                    indexes.includes(0) &&
                    items[0].replacementPolicy.allowed
                ) {
                    add(
                        "Replacement",
                        `replacement-${index}`,
                        {
                            orderId: order._id,
                            sellerOrderId: parcel._id,
                            userId: customer._id,
                            sellerProfileId: seller._id,
                            itemIndex: 0,
                            item: items[0],
                            quantity: 1,
                            reason: "Damaged item",
                            description:
                                "The item arrived with visible surface damage. Please inspect and replace.",
                            address: order.address,
                            deliveredAt: step(5),
                            deadline: new Date(step(5).getTime() + 7 * DAY),
                            status: "Requested",
                            stockReserved: false,
                            history: [
                                {
                                    status: "Requested",
                                    date: step(6),
                                    note: "Customer requested inspection.",
                                    actorUserId: customer._id,
                                },
                            ],
                        },
                        step(6)
                    );
                }
            } else {
                add(
                    "Refund",
                    `refund-${parcel._id}`,
                    {
                        orderId: order._id,
                        sellerOrderId: parcel._id,
                        sellerProfileId: seller._id,
                        userId: customer._id,
                        paymentId: `showcase-history-${index}`,
                        amountPaise: gross,
                        productAmountPaise: gross,
                        couponSharePaise: 0,
                        deliverySharePaise: 0,
                        reason: "Ordered by mistake",
                        details: "Simulated historical refund; no provider transaction.",
                        idempotencyKey: `showcase-refund-${parcel._id}`,
                        status: "Completed",
                        nextCheckAt: null,
                        cancelledAt: step(3),
                        processedAt: step(4),
                    },
                    step(3)
                );
            }
        }

        if (cancelled) {
            const parcels = rows.SellerOrder.filter(
                (parcel) => String(parcel.orderId) === String(order._id)
            );

            const shares = allocation(order, parcels);

            for (const refund of rows.Refund.filter(
                (row) => String(row.orderId) === String(order._id)
            )) {
                const share = shares.get(String(refund.sellerOrderId));
                refund.amountPaise = share.amount;
                refund.deliverySharePaise = share.shippingShare;
                refund.couponSharePaise = share.couponShare;
            }
        }

        items.forEach((item, itemIndex) => {
            const product = chosen[itemIndex];
            const variant = product.variants[0];
            const before = variant.stock;

            variant.stock -= item.quantity;

            add(
                "StockMovement",
                `sale-${index}-${itemIndex}`,
                {
                    sellerProfileId: product.sellerProfileId,
                    productId: product._id,
                    variantId: variant.variantId,
                    sku: variant.sku,
                    type: "Sale",
                    source: "order",
                    beforeQuantity: before,
                    quantityChange: -item.quantity,
                    afterQuantity: variant.stock,
                    reason: "Showcase order history",
                    reference: String(order._id),
                    operationKey: `sale:${order._id}:${product._id}:${variant.variantId}`,
                    actorUserId: customer._id,
                },
                step(0.1)
            );

            if (cancelled) {
                add(
                    "StockMovement",
                    `restore-${index}-${itemIndex}`,
                    {
                        sellerProfileId: product.sellerProfileId,
                        productId: product._id,
                        variantId: variant.variantId,
                        sku: variant.sku,
                        type: "Restock",
                        source: "order",
                        beforeQuantity: variant.stock,
                        quantityChange: item.quantity,
                        afterQuantity: before,
                        reason: "Cancelled order stock restored",
                        reference: String(order._id),
                        operationKey: `showcase-restore-${index}-${itemIndex}`,
                        actorUserId: customer._id,
                    },
                    step(3)
                );

                variant.stock = before;
            }

            if (index < 64) {
                const rating = 3 + (index % 3);

                product.ratingCount += 1;
                product.ratingSum += rating;

                add(
                    "Review",
                    `review-${index}-${itemIndex}`,
                    {
                        orderId: order._id,
                        userId: customer._id,
                        itemIndex,
                        productId: product._id,
                        sellerProfileId: product.sellerProfileId,
                        customerName: customer.name,
                        productName: product.name,
                        image: item.image,
                        rating,
                        comment: reviews[index % reviews.length],
                        status: "Published",
                        ...(index % 3 === 0
                            ? {
                                  sellerReply: {
                                      text: "Thank you for your feedback. We appreciate your order.",
                                      storeName: sellers.find(
                                          (s) => String(s._id) === String(product.sellerProfileId)
                                      ).storeName,
                                      updatedAt: step(8),
                                  },
                              }
                            : {}),
                    },
                    step(7)
                );
            }
        });
    }

    customers.slice(0, 6).forEach((customer, index) => {
        const order = rows.Order.find((row) => String(row.userId) === String(customer._id));

        add(
            "Complaint",
            `complaint-${index}`,
            {
                userId: customer._id,
                orderId: order._id,
                customer: customer.name,
                email: customer.email,
                phone: customer.phone,
                category: "Order",
                subject: "Help with my order details",
                description:
                    "Please help me understand the item and delivery details shown in my order.",
                status: ["Open", "In Progress", "Resolved"][index % 3],
                replies:
                    index % 3
                        ? [
                              {
                                  author: "Support",
                                  message:
                                      "We have checked your request and shared the order details.",
                                  createdAt: ago(0.2),
                              },
                          ]
                        : [],
            },
            ago(0.3)
        );

        add("Cart", `cart-${index}`, {
            userId: customer._id,
            items: [
                {
                    productId: approvedProducts[index % approvedProducts.length]._id,
                    variantId:
                        approvedProducts[index % approvedProducts.length].variants[0].variantId,
                    quantity: 1,
                },
            ],
        });
    });

    ["EXPLORE100", "STYLE10", "FRESH150"].forEach((code, index) => {
        add(
            "Coupon",
            `coupon-${code}`,
            {
                code,
                name: ["Welcome Offer", "Everyday Savings", "Weekend Special"][index],
                type: index === 1 ? "Percentage" : "Fixed",
                value: [100, 10, 150][index],
                maxDiscount: 300,
                minOrder: 999,
                usageLimit: 500,
                perCustomerLimit: 3,
                validFrom: ago(1).toISOString().slice(0, 10),
                validUntil: ago(-90).toISOString().slice(0, 10),
                enabled: true,
            },
            ago(1)
        );
    });

    add(
        "AuditLog",
        "completed",
        {
            actorUserId: admin._id,
            action: "Showcase seed completed",
            resourceId: VERSION,
            note: "Fictional portfolio dataset. Historical payments are not Razorpay transactions.",
        },
        new Date(now)
    );

    return rows;
}

// ================== VALIDATE BEFORE WRITING ==================
async function validatePlan(rows) {
    const slugs = new Set();

    for (const category of rows.Category) {
        if (slugs.has(category.slug))
            throw new Error(`Duplicate category slug in seed data: ${category.slug}`);

        slugs.add(category.slug);
    }

    for (const name of modelNames) {
        assert.equal(new Set(rows[name].map((row) => String(row._id))).size, rows[name].length);

        for (const row of rows[name]) await new models[name](row).validate();
    }

    for (const product of rows.Product) {
        const movements = rows.StockMovement.filter(
            (row) => String(row.productId) === String(product._id)
        );

        assert.equal(
            movements.reduce((sum, row) => sum + row.quantityChange, 0),
            product.variants[0].stock
        );

        const reviews = rows.Review.filter((row) => String(row.productId) === String(product._id));

        assert.equal(reviews.length, product.ratingCount);

        assert.equal(
            reviews.reduce((sum, row) => sum + row.rating, 0),
            product.ratingSum
        );
    }

    for (const agent of rows.DeliveryAgentProfile) assert.ok(agent.activeTasks <= agent.capacity);

    for (const order of rows.Order) {
        const parcels = rows.SellerOrder.filter((row) => String(row.orderId) === String(order._id));

        assert.deepEqual(
            parcels.flatMap((row) => row.itemIndexes).sort(),
            order.items.map((_, index) => index)
        );
    }
}

// ================== REUSE EXISTING CATEGORIES ==================
async function reconcileCategories(rows) {
    const remap = new Map();
    const retained = [];
    const policies = new Map();

    for (const category of rows.Category) {
        const originalId = String(category._id);

        if (category.parentId)
            category.parentId = remap.get(String(category.parentId)) || category.parentId;

        const existing = await models.Category.findOne({
            parentId: category.parentId || null,
            nameKey: category.nameKey,
        }).lean();

        if (existing) {
            if (existing.status !== "Active") {
                throw new Error(
                    `Category "${existing.name}" is disabled. Enable it manually or adjust the seed catalogue.`
                );
            }

            remap.set(originalId, existing._id);
            policies.set(String(existing._id), existing);
        } else {
            const conflict = await models.Category.exists({ slug: category.slug });

            if (conflict)
                throw new Error(`Category slug conflict: ${category.slug}. No records inserted.`);

            remap.set(originalId, category._id);
            policies.set(originalId, category);
            retained.push(category);
        }
    }

    rows.Category = retained;

    const productPolicies = new Map();

    for (const product of rows.Product) {
        product.categoryId = remap.get(String(product.categoryId)) || product.categoryId;

        const category = policies.get(String(product.categoryId));

        productPolicies.set(String(product._id), {
            allowed: Boolean(category.replacementAllowed),
            days: category.replacementDays || 0,
        });

        for (const attribute of category.attributes || []) {
            if (!product.specifications.some((entry) => entry.label === attribute)) {
                product.specifications.push({ label: attribute, value: "Not specified" });
            }
        }
    }

    for (const order of rows.Order) {
        for (const item of order.items)
            item.replacementPolicy = productPolicies.get(String(item.productId));
    }

    rows.Replacement = rows.Replacement.filter((request) => {
        const policy = productPolicies.get(String(request.item.productId));

        request.item.replacementPolicy = policy;
        request.deadline = new Date(request.deliveredAt.getTime() + policy.days * DAY);

        return policy.allowed && request.deadline > new Date();
    });
}

// ================== CHECK EXISTING RECORD CONFLICTS ==================
async function checkConflicts(rows) {
    for (const name of modelNames) {
        if (!rows[name].length) continue;

        const conflict = await models[name].exists({
            _id: { $in: rows[name].map((row) => row._id) },
        });

        if (conflict)
            throw new Error(
                `Existing seed IDs found in ${name}, but completion marker is missing. No records inserted.`
            );
    }

    if (
        await models.User.exists({
            $or: [
                { email: { $in: rows.User.map((row) => row.email) } },
                { phone: { $in: rows.User.map((row) => row.phone) } },
            ],
        })
    )
        throw new Error(
            "A sample email or phone already exists. No existing account was changed; adjust the sample account values first."
        );

    if (
        await models.Product.exists({
            productCode: { $in: rows.Product.map((row) => row.productCode) },
        })
    ) {
        throw new Error("A sample product code already exists. No records inserted.");
    }

    if (await models.Coupon.exists({ code: { $in: rows.Coupon.map((row) => row.code) } })) {
        throw new Error(
            "A sample coupon code already exists. Adjust the sample coupon codes first; existing coupons are preserved."
        );
    }
}

// ================== UPDATE LOGINS ON AN ALREADY-SEEDED DATABASE ==================
async function updateSeededLogins(apply) {
    const accounts = Object.entries(demoEmails).map(([role, email]) => ({
        role,
        email,
        oldEmail: `${role}1@showcase-v2.example`,
        userId: id(`${role}-1`),
    }));

    const ids = accounts.map((account) => account.userId);

    const existing = await models.User.find({ _id: { $in: ids } })
        .select("_id email role")
        .lean();

    for (const account of accounts) {
        const user = existing.find((row) => String(row._id) === String(account.userId));

        if (!user || user.role !== account.role) {
            throw new Error(`Seed-owned ${account.role} user not found. No records changed.`);
        }

        if (![account.oldEmail, account.email].includes(user.email)) {
            throw new Error(
                `${account.role} seed account email was manually changed. No records changed.`
            );
        }
    }

    const conflict = await models.User.exists({
        email: { $in: accounts.map((account) => account.email) },
        _id: { $nin: ids },
    });

    if (conflict) {
        throw new Error("A requested demo email belongs to another user. No records changed.");
    }

    const sellerProfile = await models.SellerProfile.exists({
        _id: id("store-0"),
        userId: id("seller-1"),
    });

    if (!sellerProfile) {
        throw new Error("The first showcase seller profile is missing. No records changed.");
    }

    console.table(accounts.map(({ role, email }) => ({ role, email })));

    if (!apply) {
        console.log("Dry run passed. Use --apply to update only these four demo logins.");
        return;
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    await mongoose.connection.transaction(async (session) => {
        for (const account of accounts) {
            const result = await models.User.updateOne(
                {
                    _id: account.userId,
                    role: account.role,
                    email: { $in: [account.oldEmail, account.email] },
                },
                { $set: { email: account.email, passwordHash } },
                { session }
            );

            if (result.matchedCount !== 1) {
                throw new Error(`Could not safely update ${account.role} demo login.`);
            }
        }

        const result = await models.SellerProfile.updateOne(
            { _id: id("store-0"), userId: id("seller-1") },
            { $set: { storeEmail: demoEmails.seller } },
            { session }
        );

        if (result.matchedCount !== 1) throw new Error("Seller email update failed.");

        await models.Complaint.updateOne(
            { _id: id("complaint-0"), userId: id("customer-1") },
            { $set: { email: demoEmails.customer } },
            { session }
        );
    });

    console.log("Four existing showcase logins updated. All other records preserved.");
    console.log("Demo password for all four accounts: 123456 (development only).");
}

// ================== SYNC CATEGORIES FOR EXISTING SHOWCASE DATA ==================
async function syncExistingCatalogue(catalogue, apply) {
    const existingCategories = await models.Category.find().lean();

    const existingProducts = await models.Product.find({ productCode: /^SHOWCASE-/ })
        .select("_id productCode categoryId specifications sellerProfileId")
        .lean();

    const admin = await models.User.findOne({ role: "admin" }).select("_id").lean();

    if (!admin) throw new Error("An admin account is required to create categories.");

    const bySlug = new Map(existingCategories.map((row) => [row.slug, row]));
    const byId = new Map(existingCategories.map((row) => [String(row._id), row]));
    const created = [];
    const updated = [];
    const finalCategories = new Map();
    const desiredIds = new Set();

    function categoryRecord(key, data) {
        return { _id: id(key), ...data, createdAt: ago(60), updatedAt: new Date() };
    }

    function ensureCategory(existing, key, data) {
        const desired = existing
            ? { ...existing, ...data, updatedAt: new Date() }
            : categoryRecord(key, data);

        desiredIds.add(String(desired._id));

        if (existing) {
            const changes = {};

            for (const [field, value] of Object.entries(data)) {
                if (JSON.stringify(existing[field]) !== JSON.stringify(value)) changes[field] = value;
            }

            if (Object.keys(changes).length) updated.push({ id: existing._id, changes });
        } else {
            if (byId.has(String(desired._id))) {
                throw new Error(`Category ID conflict for ${data.name}. No records changed.`);
            }

            created.push(desired);
            byId.set(String(desired._id), desired);
            bySlug.set(desired.slug, desired);
        }

        return desired;
    }

    const sourceProducts = new Map(catalogue.map((source) => [source.category, source]));

    for (const [index, [parent, ...children]] of groups.entries()) {
        const slug = departmentSlug(parent);

        const existingRoot = existingCategories.find(
            (row) => !row.parentId && (row.slug === slug || row.nameKey === parent.toLowerCase())
        );

        const cover = sourceProducts.get(children[0])?.images[0];

        if (!cover) throw new Error(`Catalogue image missing for ${parent}.`);

        const root = ensureCategory(existingRoot, `category-${parent}`, {
            name: parent,
            nameKey: parent.toLowerCase(),
            slug: existingRoot?.slug || slug,
            parentId: null,
            sortOrder: index + 1,
            showOnHome: true,
            status: "Active",
            image: existingRoot?.image?.url ? existingRoot.image : { url: cover, publicId: "" },
            createdById: existingRoot?.createdById || admin._id,
            updatedById: admin._id,
        });

        for (const [position, source] of children.entries()) {
            const name = subcategoryNames[source];
            const existingLeaf = bySlug.get(source);

            const conflictingLeaf = existingCategories.find(
                (row) =>
                    String(row.parentId || "") === String(root._id) &&
                    row.nameKey === name.toLowerCase() &&
                    row.slug !== source
            );

            if (conflictingLeaf && String(conflictingLeaf._id) !== String(existingLeaf?._id)) {
                throw new Error(`Category name conflict: ${parent} > ${name}.`);
            }

            const leaf = ensureCategory(existingLeaf, `subcategory-${source}`, {
                name,
                nameKey: name.toLowerCase(),
                slug: source,
                parentId: root._id,
                sortOrder: position + 1,
                replacementAllowed: source !== "groceries",
                replacementDays: source === "groceries" ? 0 : 7,
                status: "Active",
                createdById: existingLeaf?.createdById || admin._id,
                updatedById: admin._id,
            });

            finalCategories.set(source, leaf);
        }
    }

    const sourceByCode = new Map(catalogue.map((source) => [`SHOWCASE-${source.id}`, source]));
    const existingCodes = new Set(existingProducts.map((product) => product.productCode));
    const productUpdates = [];
    const unrecognized = [];

    for (const product of existingProducts) {
        const source = sourceByCode.get(product.productCode);
        const sourceSlug = source?.category || byId.get(String(product.categoryId))?.slug;
        const category = finalCategories.get(sourceSlug);

        if (!category) {
            unrecognized.push(product.productCode);
            continue;
        }

        const specifications = product.specifications || [];
        const expectedLabel = `${categoryBySource.get(sourceSlug).parent} > ${category.name}`;
        const currentLabel = specifications.find((entry) => entry.label === "Category")?.value;

        if (String(product.categoryId) !== String(category._id) || currentLabel !== expectedLabel) {
            const nextSpecifications = specifications.filter((entry) => entry.label !== "Category");
            nextSpecifications.unshift({ label: "Category", value: expectedLabel });

            productUpdates.push({
                id: product._id,
                categoryId: category._id,
                specifications: nextSpecifications,
            });
        }
    }

    const missingCatalogue = catalogue.filter((source) => !existingCodes.has(`SHOWCASE-${source.id}`));

    const sellerIds = [...new Set(existingProducts.map((product) => String(product.sellerProfileId)))];
    const sellers = await models.SellerProfile.find({ _id: { $in: sellerIds } }).lean();
    const sellerByName = new Map(sellers.map((seller) => [seller.storeName, seller]));

    const assignedSellers = stores.map(
        (name, index) => sellerByName.get(name) || sellers[index % sellers.length]
    );

    if (missingCatalogue.length && !sellers.length) {
        throw new Error("No seller profiles belong to existing showcase products. No records changed.");
    }

    const additions = { Product: [], StockMovement: [] };

    const add = (model, key, data, date = ago(60)) => {
        const row = { _id: id(key), ...data, createdAt: date, updatedAt: date };
        additions[model].push(row);
        return row;
    };

    buildProductRecords(missingCatalogue, assignedSellers, finalCategories, add, admin);

    // Retire legacy empty parents without deleting referenced categories.
    const obsoleteRoots = existingCategories.filter(
        (row) => !row.parentId && row.slug?.startsWith("department-") && !desiredIds.has(String(row._id))
    );

    for (const category of created) await new models.Category(category).validate();
    for (const product of additions.Product) await new models.Product(product).validate();
    for (const movement of additions.StockMovement) await new models.StockMovement(movement).validate();

    console.table({
        "Main categories": { count: groups.length },
        "Subcategories": { count: finalCategories.size },
        "New categories": { count: created.length },
        "Updated categories": { count: updated.length },
        "Products recategorized": { count: productUpdates.length },
        "New products": { count: additions.Product.length },
        "Existing products preserved": { count: existingProducts.length },
        "Unrecognized showcase products": { count: unrecognized.length },
    });

    if (unrecognized.length) {
        console.log(`Unrecognized showcase products left unchanged: ${unrecognized.join(", ")}`);
    }

    if (!apply) {
        console.log("Dry run complete. No changes made. Run with --apply to sync catalogue categories.");
        return;
    }

    await mongoose.connection.transaction(async (session) => {
        // Parents and children use deterministic IDs; insert parents first.
        const parents = created.filter((row) => !row.parentId);
        const children = created.filter((row) => row.parentId);

        if (parents.length) await models.Category.insertMany(parents, { session });
        if (children.length) await models.Category.insertMany(children, { session });

        if (updated.length) {
            await models.Category.bulkWrite(
                updated.map(({ id, changes }) => ({
                    updateOne: {
                        filter: { _id: id },
                        update: { $set: changes },
                    },
                })),
                { session, ordered: true }
            );
        }

        if (productUpdates.length) {
            await models.Product.bulkWrite(
                productUpdates.map((product) => ({
                    updateOne: {
                        filter: { _id: product.id },
                        update: {
                            $set: {
                                categoryId: product.categoryId,
                                specifications: product.specifications,
                            },
                        },
                    },
                })),
                { session, ordered: true }
            );
        }

        if (additions.Product.length) {
            await models.Product.insertMany(additions.Product, { session });
            await models.StockMovement.insertMany(additions.StockMovement, { session });
        }

        let retired = 0;

        for (const category of obsoleteRoots) {
            const children = await models.Category.countDocuments({
                parentId: category._id,
            }).session(session);

            const directProducts = await models.Product.countDocuments({
                categoryId: category._id,
            }).session(session);

            if (!children && !directProducts) {
                await models.Category.deleteOne({ _id: category._id }).session(session);
                retired += 1;
            } else {
                await models.Category.updateOne(
                    { _id: category._id },
                    { $set: { showOnHome: false } },
                    { session }
                );
            }
        }

        console.log(`Obsolete empty showcase departments retired: ${retired}`);
    });

    console.log("Catalogue sync complete. Existing orders, stock history and login accounts unchanged.");
}

// ================== IMPORT INTO THE EXISTING DATABASE ==================
async function main() {
    if (!process.env.DB_URI) throw new Error("DB_URI is missing in backend/.env.");

    const apply = process.argv.includes("--apply");

    await mongoose.connect(process.env.DB_URI, {
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 15000,
    });

    const target = mongoose.connection.name;
    console.log(`Database from DB_URI: ${target}`);

    // Existing showcase data needs category migration, not duplicate users.
    if (await models.Product.exists({ productCode: /^SHOWCASE-/ })) {
        const catalogue = await fetchCatalogue();
        await syncExistingCatalogue(catalogue, apply);
        return;
    }

    if (await models.AuditLog.exists({ _id: markerId, resourceId: VERSION })) {
        console.log("Seed completion marker exists but showcase products are missing. No changes made.");
        return;
    }

    if (apply && process.env.NODE_ENV === "production") {
        throw new Error("Known demo passwords must not be seeded into a production database.");
    }

    const password = process.env.SEED_PASSWORD || "";

    if (password.length < 14 || password.length > 60) {
        throw new Error("Set a private SEED_PASSWORD containing 14–60 characters.");
    }

    if (!process.env.OTP_SECRET || process.env.OTP_SECRET.length < 32) {
        throw new Error("Keep your existing OTP_SECRET (at least 32 characters).");
    }

    const catalogue = await fetchCatalogue();

    const existingProducts = await models.Product.find({
        productCode: { $in: catalogue.map((source) => `SHOWCASE-${source.id}`) },
    })
        .select("productCode")
        .lean();

    const excludedCodes = new Set(existingProducts.map((product) => product.productCode));

    console.log(`Existing catalogue products preserved: ${excludedCodes.size}`);

    const rows = await buildPlan(catalogue, password, excludedCodes);

    await reconcileCategories(rows);
    await validatePlan(rows);
    await checkConflicts(rows);

    console.table(
        Object.fromEntries(modelNames.map((name) => [name, { newRecords: rows[name].length }]))
    );

    if (!apply) {
        console.log(`Dry run passed for ${target}. Read-only checks completed; no data inserted.`);
        return;
    }

    // Inserts and the completion marker commit together.
    for (const name of modelNames) await models[name].createIndexes();

    await mongoose.connection.transaction(async (session) => {
        for (const name of modelNames) {
            if (rows[name].length)
                await models[name].insertMany(rows[name], { session, ordered: true });
        }
    });

    console.log(`Completed: sample data added to ${target}. Existing records preserved.`);
    console.table(Object.entries(demoEmails).map(([role, email]) => ({ role, email })));
    console.log("Demo password for these four accounts: 123456 (development only).");
    console.log("Other generated users use SEED_PASSWORD. Existing accounts are unchanged.");
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error("Showcase seed stopped:", error.message);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}

module.exports = {
    buildPlan,
    validatePlan,
    fetchCatalogue,
    reconcileCategories,
    checkConflicts,
    updateSeededLogins,
    syncExistingCatalogue,
    buildProductRecords,
};
