export const SHOW_DEMO_ORDERS = true;

export const demoOrders = [
    {
        _id: "ZUP-20261103-1001",
        createdAt: "2026-11-03T10:30:00",
        orderStatus: "out_for_delivery",
        expectedDeliveryAt: "2026-11-04",
        totalAmount: 15998,
        items: [
            {
                name: "Everyday Smartphone - Black, 128 GB",
                image: "/images/categories/mobiles.webp",
                quantity: 1
            },
            {
                name: "Over-Ear Wireless Headphones",
                image: "/images/categories/headphones.jpg",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261102-1002",
        createdAt: "2026-11-02T14:15:00",
        orderStatus: "delivered",
        deliveredAt: "2026-11-03",
        totalAmount: 899,
        items: [
            {
                name: "Men's Casual Shirt - Navy, M",
                image: "/images/categories/mens-wear.webp",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261030-1003",
        createdAt: "2026-10-30T11:20:00",
        orderStatus: "shipped",
        expectedDeliveryAt: "2026-11-07",
        totalAmount: 42999,
        items: [
            {
                name: "Everyday Performance Laptop",
                image: "/images/categories/laptops.webp",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261028-1004",
        createdAt: "2026-10-28T09:45:00",
        orderStatus: "cancelled",
        totalAmount: 1299,
        items: [
            {
                name: "Women's Everyday Dress",
                image: "/images/categories/womens-wear.webp",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261024-1005",
        createdAt: "2026-10-24T16:10:00",
        orderStatus: "delivered",
        deliveredAt: "2026-10-27",
        totalAmount: 2499,
        items: [
            {
                name: "Travel Backpack",
                image: "/images/categories/backpacks.jpg",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261020-1006",
        createdAt: "2026-10-20T12:00:00",
        orderStatus: "processing",
        expectedDeliveryAt: "2026-11-08",
        totalAmount: 1999,
        items: [
            {
                name: "Over-Ear Wireless Headphones",
                image: "/images/categories/headphones.jpg",
                quantity: 1
            }
        ]
    },
    {
        _id: "ZUP-20261015-1007",
        createdAt: "2026-10-15T17:30:00",
        orderStatus: "delivered",
        deliveredAt: "2026-10-18",
        totalAmount: 1299,
        items: [
            {
                name: "Women's Everyday Dress",
                image: "/images/categories/womens-wear.webp",
                quantity: 1
            }
        ]
    }
];

export const demoAddress = {
    name: "Demo Customer",
    phone: "98******21",
    house: "Flat 204, Sample Residency",
    area: "Demo Street",
    city: "Bhubaneswar",
    state: "Odisha",
    pincode: "751001"
};

export const demoEventTimestamps = {
    "ZUP-20261103-1001": {
        confirmedAt: "2026-11-03T10:45:00+05:30",
        packedAt: "2026-11-03T15:00:00+05:30",
        shippedAt: "2026-11-03T18:30:00+05:30",
        outForDeliveryAt: "2026-11-04T09:10:00+05:30"
    },
    "ZUP-20261102-1002": {
        confirmedAt: "2026-11-02T14:30:00+05:30",
        packedAt: "2026-11-02T17:00:00+05:30",
        shippedAt: "2026-11-03T07:45:00+05:30",
        outForDeliveryAt: "2026-11-03T09:30:00+05:30",
        deliveredAt: "2026-11-03T12:10:00+05:30"
    },
    "ZUP-20261030-1003": {
        confirmedAt: "2026-10-30T11:35:00+05:30",
        packedAt: "2026-10-30T14:45:00+05:30",
        shippedAt: "2026-10-31T10:20:00+05:30"
    },
    "ZUP-20261028-1004": {
        cancelledAt: "2026-10-28T10:05:00+05:30"
    },
    "ZUP-20261024-1005": {
        confirmedAt: "2026-10-24T16:20:00+05:30",
        packedAt: "2026-10-25T11:20:00+05:30",
        shippedAt: "2026-10-25T16:40:00+05:30",
        outForDeliveryAt: "2026-10-27T09:05:00+05:30",
        deliveredAt: "2026-10-27T14:15:00+05:30"
    },
    "ZUP-20261020-1006": {
        confirmedAt: "2026-10-20T12:25:00+05:30"
    },
    "ZUP-20261015-1007": {
        confirmedAt: "2026-10-15T18:00:00+05:30",
        packedAt: "2026-10-16T10:30:00+05:30",
        shippedAt: "2026-10-16T18:20:00+05:30",
        outForDeliveryAt: "2026-10-18T09:30:00+05:30",
        deliveredAt: "2026-10-18T13:50:00+05:30"
    }
};

export const demoParcels = {
    "ZUP-20261103-1001": [
        {
            id: "PKG-1001-A",
            status: "out_for_delivery",
            itemIndexes: [0],
            expectedDeliveryAt: "2026-11-05",
            deliveryOtp: "482916",
            eventTimestamps: {
                confirmedAt: "2026-11-03T10:45:00+05:30",
                packedAt: "2026-11-03T15:00:00+05:30",
                shippedAt: "2026-11-03T18:30:00+05:30",
                outForDeliveryAt: "2026-11-04T09:10:00+05:30"
            }
        },
        {
            id: "PKG-1001-B",
            status: "shipped",
            itemIndexes: [1],
            expectedDeliveryAt: "2026-11-07",
            eventTimestamps: {
                confirmedAt: "2026-11-03T11:00:00+05:30",
                packedAt: "2026-11-04T12:30:00+05:30",
                shippedAt: "2026-11-04T17:15:00+05:30"
            }
        }
    ]
};

export const demoProductLinks = {
    "Everyday Smartphone - Black, 128 GB": ["preview-smartphone", "smartphone-black-128"],
    "Over-Ear Wireless Headphones": ["preview-headphones"],
    "Men's Casual Shirt - Navy, M": ["preview-shirt"],
    "Everyday Performance Laptop": ["preview-laptop"],
    "Women's Everyday Dress": ["preview-dress"],
    "Travel Backpack": ["preview-backpack"]
};
