const CATEGORY_IMAGES = "/images/categories";

const image = (filename) => `${CATEGORY_IMAGES}/${filename}`;

const paragraph = (title, text) => ({ title, text });

const specification = (label, value) => ({ label, value });

const option = (value, label = value, extra = {}) => ({
    value,
    label,
    ...extra
});

const variant = (id, options, price, mrp, stock, extra = {}) => ({
    id,
    options,
    price,
    mrp,
    stock,
    ...extra
});

/*
 * Local preview catalogue.
 *
 * Before connecting live products, replace sample specifications,
 * ratings, stock and prices with verified catalogue data.
 *
 * defaultVariantId is the fallback selection.
 * It is not a claim that the variant is the best seller.
 *
 * Top Selling will later receive its representative variant from
 * sales data. Search and filters can select a different matching
 * variant without changing this catalogue default.
 */

const catalogItems = [
    {
        _id: "preview-smartphone",
        name: "Everyday Smartphone",
        brand: "NovaTech",
        category: "mobiles",
        group: "electronics",
        image: image("mobiles.webp"),
        price: 14999,
        mrp: 17999,
        stock: 12,
        rating: 4.5,
        ratingCount: 250,
        variantLabel: "Black · 128 GB",
        defaultVariantId: "smartphone-black-128",

        optionGroups: [
            {
                key: "color",
                label: "Colour",
                values: [
                    option("Black", "Black", { swatch: "#252932" }),
                    option("Blue", "Blue", { swatch: "#315b88" })
                ]
            },
            {
                key: "storage",
                label: "Storage",
                values: [option("128 GB"), option("256 GB")]
            }
        ],

        variants: [
            variant("smartphone-black-128", { color: "Black", storage: "128 GB" }, 14999, 17999, 12),
            variant("smartphone-black-256", { color: "Black", storage: "256 GB" }, 17999, 20999, 6),
            variant("smartphone-blue-128", { color: "Blue", storage: "128 GB" }, 14999, 17999, 5),
            variant("smartphone-blue-256", { color: "Blue", storage: "256 GB" }, 17999, 20999, 0)
        ],

        highlights: [
            "Choose between 128 GB and 256 GB storage",
            "Available in Black and Blue finishes",
            "A practical choice for everyday apps and entertainment",
            "Price and availability depend on the selected configuration"
        ],

        description: [
            paragraph(
                "Made for everyday use",
                "Keep your everyday essentials together, from conversations and calendars to photos, playlists and favourite apps. A clean finish makes this smartphone easy to pair with your daily accessories."
            ),
            paragraph(
                "Choose your storage",
                "Select 128 GB for everyday essentials or 256 GB when you prefer more room for photos, videos and downloads. Your selected storage and colour appear alongside the price before you add the phone to your cart."
            ),
            paragraph(
                "Find your finish",
                "Choose understated Black or a Blue finish to suit your preference. Available colour and storage combinations are shown in the selection area."
            )
        ],

        specifications: [
            specification("Product type", "Smartphone"),
            specification("Storage options", "128 GB / 256 GB"),
            specification("Colour options", "Black / Blue"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-laptop",
        name: "Everyday Performance Laptop",
        brand: "NovaTech",
        category: "laptops",
        group: "electronics",
        image: image("laptops.webp"),
        price: 42999,
        mrp: 47999,
        stock: 8,
        rating: 4.6,
        ratingCount: 118,
        variantLabel: "8 GB RAM · 512 GB SSD",
        defaultVariantId: "laptop-8gb",

        optionGroups: [
            {
                key: "ram",
                label: "RAM",
                values: [option("8 GB"), option("16 GB")]
            }
        ],

        variants: [
            variant("laptop-8gb", { ram: "8 GB" }, 42999, 47999, 8, {
                variantLabel: "8 GB RAM · 512 GB SSD"
            }),
            variant("laptop-16gb", { ram: "16 GB" }, 47999, 52999, 4, {
                variantLabel: "16 GB RAM · 512 GB SSD"
            })
        ],

        highlights: [
            "512 GB SSD storage",
            "Choose 8 GB or 16 GB RAM",
            "Suitable for everyday work and study setups",
            "Two memory configurations to match your requirements"
        ],

        description: [
            paragraph(
                "A place for work and study",
                "Build your everyday setup around a laptop for documents, browsing, learning and entertainment. Its understated appearance fits comfortably into a home desk or study space."
            ),
            paragraph(
                "Select your memory configuration",
                "Choose 8 GB RAM for a lighter everyday workload or 16 GB RAM when you regularly keep more applications open. Both listed configurations include 512 GB SSD storage."
            ),
            paragraph(
                "Check your requirements",
                "Match your selected configuration to the software you use. Review the specifications before choosing a laptop for specialist editing, design or gaming workloads."
            )
        ],

        specifications: [
            specification("Product type", "Laptop"),
            specification("RAM options", "8 GB / 16 GB"),
            specification("Storage", "512 GB SSD"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-headphones",
        name: "Over-Ear Headphones",
        brand: "SoundNest",
        category: "headphones",
        group: "electronics",
        image: image("headphones.jpg"),
        price: 1999,
        mrp: 2499,
        stock: 20,
        rating: 4.3,
        ratingCount: 326,
        variantLabel: "Black",

        highlights: [
            "Over-ear design",
            "Padded ear cushions",
            "Classic Black finish",
            "A convenient addition to your listening setup"
        ],

        description: [
            paragraph(
                "Settle into your listening time",
                "Bring music, podcasts and everyday entertainment into your personal listening space. The over-ear shape surrounds the ears, while the padded cushions provide a soft contact surface."
            ),
            paragraph(
                "An understated addition",
                "A Black finish pairs easily with a laptop, desk or home entertainment setup. The simple appearance keeps the focus on your everyday listening routine."
            ),
            paragraph(
                "Care and storage",
                "Wipe the exterior gently with a soft, dry cloth. Keep the headphones away from moisture and store them carefully when they are not in use."
            )
        ],

        specifications: [
            specification("Product type", "Headphones"),
            specification("Wearing style", "Over-ear"),
            specification("Colour", "Black"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-shirt",
        name: "Men's Casual Shirt",
        brand: "UrbanThread",
        category: "mens-wear",
        group: "fashion",
        image: image("mens-wear.webp"),
        price: 899,
        mrp: 1299,
        stock: 18,
        rating: 4.2,
        ratingCount: 164,
        variantLabel: "Navy · M",
        defaultVariantId: "shirt-navy-m",

        optionGroups: [
            {
                key: "size",
                label: "Size",
                values: [option("S"), option("M"), option("L"), option("XL")]
            }
        ],

        variants: [
            variant("shirt-navy-s", { size: "S" }, 899, 1299, 7, { variantLabel: "Navy · S" }),
            variant("shirt-navy-m", { size: "M" }, 899, 1299, 18, { variantLabel: "Navy · M" }),
            variant("shirt-navy-l", { size: "L" }, 899, 1299, 10, { variantLabel: "Navy · L" }),
            variant("shirt-navy-xl", { size: "XL" }, 899, 1299, 0, { variantLabel: "Navy · XL" })
        ],

        highlights: [
            "Cotton fabric",
            "Regular fit with full sleeves",
            "Versatile Navy colour",
            "Available in S, M, L and XL sizes"
        ],

        description: [
            paragraph(
                "An everyday wardrobe essential",
                "This Navy casual shirt brings an easy-to-style option to your wardrobe. Wear it with denim for a relaxed outfit or pair it with chinos for a more put-together look."
            ),
            paragraph(
                "Simple styling",
                "The regular fit and full sleeves work well on their own or as part of a layered outfit. The solid colour makes it easy to coordinate with neutral trousers and everyday footwear."
            ),
            paragraph(
                "Choose your fit",
                "Check the selected size before adding the shirt to your cart. If you prefer a different fit, choose another available size from the options above."
            ),
            paragraph(
                "Garment care",
                "Follow the garment's care label for washing, drying and ironing instructions. Wash similar colours together to help maintain the appearance."
            )
        ],

        specifications: [
            specification("Product type", "Casual shirt"),
            specification("Fabric", "Cotton"),
            specification("Fit", "Regular"),
            specification("Sleeves", "Full sleeves"),
            specification("Colour", "Navy"),
            specification("Size options", "S / M / L / XL")
        ]
    },

    {
        _id: "preview-dress",
        name: "Women's Everyday Dress",
        brand: "UrbanThread",
        category: "womens-wear",
        group: "fashion",
        image: image("womens-wear.webp"),
        price: 1299,
        mrp: 1799,
        stock: 16,
        rating: 4.5,
        ratingCount: 207,
        variantLabel: "Navy · M",

        highlights: [
            "Versatile Navy finish",
            "Easy to coordinate with everyday accessories",
            "An option for casual outings and get-togethers",
            "Listed size: M"
        ],

        description: [
            paragraph(
                "Easy everyday dressing",
                "Keep outfit planning simple with a Navy dress that pairs with a variety of accessories. Style it with flats for a relaxed outing or add your favourite bag and jewellery for a different look."
            ),
            paragraph(
                "Make the outfit your own",
                "The understated colour gives you room to experiment with lighter accessories, neutral footwear or a contrasting handbag."
            ),
            paragraph(
                "Fit and care",
                "Review the listed size before ordering. Follow the attached garment label for the appropriate washing and care instructions."
            )
        ],

        specifications: [
            specification("Product type", "Dress"),
            specification("Colour", "Navy"),
            specification("Size", "M"),
            specification("Quantity", "1 dress")
        ]
    },

    {
        _id: "preview-kids",
        name: "Kids' Casual Outfit",
        brand: "LittleSteps",
        category: "kids-wear",
        group: "fashion",
        image: image("kids-wear.webp"),
        price: 699,
        mrp: 999,
        stock: 14,
        rating: 4.4,
        ratingCount: 92,
        variantLabel: "Pink · 3–4 years",

        highlights: ["Pink colour", "Listed age group: 3–4 years", "Casual everyday styling"],

        description: [
            paragraph(
                "A cheerful wardrobe addition",
                "Add a soft Pink outfit to your child's casual wardrobe. Pair it with everyday footwear and simple accessories for outings and family time."
            ),
            paragraph(
                "Check the fit",
                "The listed age group is a guide. Consider your child's measurements and usual fit when selecting clothing."
            )
        ],

        specifications: [
            specification("Product type", "Kids' outfit"),
            specification("Colour", "Pink"),
            specification("Age group", "3–4 years")
        ]
    },

    {
        _id: "preview-shoes",
        name: "Everyday Casual Sneakers",
        brand: "UrbanStep",
        category: "footwear",
        group: "fashion",
        image: image("footwear.webp"),
        price: 1499,
        mrp: 1999,
        stock: 15,
        rating: 4.3,
        ratingCount: 284,
        variantLabel: "White · UK 8",

        highlights: [
            "White casual sneakers",
            "Lace-up fastening",
            "Easy to pair with denim and casual trousers",
            "Listed size: UK 8"
        ],

        description: [
            paragraph(
                "A versatile finishing touch",
                "White sneakers offer a simple starting point for everyday outfits. Pair them with jeans, chinos or relaxed clothing for a coordinated casual look."
            ),
            paragraph(
                "Adjust your fit",
                "The lace-up fastening lets you adjust how the shoes sit on your feet. Check the listed UK size against your usual footwear size before ordering."
            ),
            paragraph(
                "Keep them looking their best",
                "Remove surface dust with a soft brush or cloth. Follow the footwear care instructions and allow damp shoes to dry naturally away from direct heat."
            )
        ],

        specifications: [
            specification("Product type", "Casual sneakers"),
            specification("Colour", "White"),
            specification("Size", "UK 8"),
            specification("Fastening", "Lace-up"),
            specification("Quantity", "1 pair")
        ]
    },

    {
        _id: "preview-watch",
        name: "Classic Everyday Watch",
        brand: "HourLine",
        category: "watches",
        group: "fashion",
        image: "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/1.webp",

        images: [
            "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/2.webp",
            "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/3.webp"
        ],
        price: 1299,
        mrp: 1799,
        stock: 10,
        rating: 4.5,
        ratingCount: 186,
        variantLabel: "Black",

        highlights: ["Analogue display", "Black finish", "A simple accessory for everyday outfits"],

        description: [
            paragraph(
                "A classic everyday accessory",
                "Complete your outfit with a Black analogue watch. Its understated styling works with casual clothing and more coordinated everyday looks."
            ),
            paragraph(
                "Care for your watch",
                "Clean gently with a soft, dry cloth and store away from moisture. Avoid exposure to water unless the product's confirmed water-resistance specification permits it."
            )
        ],

        specifications: [
            specification("Product type", "Wristwatch"),
            specification("Display", "Analogue"),
            specification("Colour", "Black"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-personal-care",
        name: "Daily Personal Care Kit",
        brand: "PureDaily",
        category: "personal-care",
        group: "personal-care",
        image: image("personal-care.webp"),
        price: 449,
        mrp: 599,
        stock: 24,
        rating: 4.4,
        ratingCount: 143,
        packLabel: "Pack of 3",

        highlights: [
            "Three-item personal care pack",
            "A convenient addition to your daily routine",
            "Check individual packaging for usage instructions"
        ],

        description: [
            paragraph(
                "Organise your daily essentials",
                "Keep personal care items together in a convenient three-item pack. Arrange them on your bathroom shelf or with your other daily essentials for easy access."
            ),
            paragraph(
                "Use each item as directed",
                "Read the ingredients, directions and precautions printed on each individual pack before use. Storage and usage requirements can differ between items."
            ),
            paragraph(
                "Pack information",
                "Refer to the individual labels for net contents, manufacturing information and expiry details."
            )
        ],

        specifications: [
            specification("Product type", "Personal care kit"),
            specification("Pack size", "3 items"),
            specification("Usage", "As directed on individual labels")
        ]
    },

    {
        _id: "preview-pantry",
        name: "Kitchen Pantry Essentials",
        brand: "DailyPantry",
        category: "daily-essentials",
        group: "grocery",
        image: image("daily-essentials.webp"),
        price: 799,
        mrp: 949,
        stock: 22,
        rating: 4.6,
        ratingCount: 218,
        packLabel: "Combo · 3 items",

        highlights: [
            "Three-item pantry combination",
            "Convenient for organising kitchen essentials",
            "Refer to each pack for ingredients and net quantity"
        ],

        description: [
            paragraph(
                "Bring pantry essentials together",
                "Keep your kitchen organised with a combination of everyday pantry items. Store each item where it is easy to find when planning meals and preparing your usual recipes."
            ),
            paragraph(
                "Check individual pack details",
                "Ingredients, allergen information, net quantities and preparation directions belong to each individual item. Read its packaging before use."
            ),
            paragraph(
                "Storage after opening",
                "Follow the storage instructions printed on each pack. Keep suitable dry ingredients securely closed and away from moisture."
            )
        ],

        specifications: [
            specification("Product type", "Pantry combination"),
            specification("Pack size", "3 items"),
            specification("Net quantity", "Refer to individual packs"),
            specification("Storage", "Follow individual pack instructions")
        ]
    },

    {
        _id: "preview-snacks",
        name: "Everyday Snack Selection",
        brand: "DailyPantry",
        category: "snacks-drinks",
        group: "grocery",
        image: image("snacks-drinks.webp"),
        price: 249,
        mrp: 299,
        stock: 30,
        rating: 4.2,
        ratingCount: 375,
        packLabel: "500 g",
        defaultVariantId: "snacks-500g",

        optionGroups: [
            {
                key: "pack",
                label: "Pack size",
                values: [option("250 g"), option("500 g"), option("1 kg")]
            }
        ],

        variants: [
            variant("snacks-250g", { pack: "250 g" }, 139, 169, 18, { packLabel: "250 g" }),
            variant("snacks-500g", { pack: "500 g" }, 249, 299, 30, { packLabel: "500 g" }),
            variant("snacks-1kg", { pack: "1 kg" }, 469, 549, 12, { packLabel: "1 kg" })
        ],

        highlights: [
            "Choose 250 g, 500 g or 1 kg",
            "Pack size shown clearly before purchase",
            "An option for snack breaks and sharing",
            "Check the pack for ingredients and allergen information"
        ],

        description: [
            paragraph(
                "Make room for a snack break",
                "Keep a snack selection ready for a break during the day or for sharing at home. Choose a pack size that suits how much you would like to keep on hand."
            ),
            paragraph(
                "Choose the quantity you need",
                "Select a smaller 250 g pack, the 500 g option or a larger 1 kg pack. The displayed price and availability update for your chosen size."
            ),
            paragraph(
                "Read the pack information",
                "Check ingredients, allergens, nutritional information and the best-before date on the packaging before consumption."
            ),
            paragraph(
                "Store carefully",
                "Follow the pack's storage instructions. Close the packaging securely after opening to help protect the contents from moisture."
            )
        ],

        specifications: [
            specification("Product type", "Packaged snacks"),
            specification("Pack options", "250 g / 500 g / 1 kg"),
            specification("Ingredients", "Refer to packaging"),
            specification("Allergen information", "Refer to packaging")
        ]
    },

    {
        _id: "preview-beauty",
        name: "Everyday Makeup Essentials",
        brand: "GlowEdit",
        category: "beauty",
        group: "personal-care",
        image: image("beauty.webp"),
        price: 899,
        mrp: 1199,
        stock: 17,
        rating: 4.3,
        ratingCount: 109,
        packLabel: "Pack of 3",

        highlights: [
            "Three-item makeup pack",
            "Keep your everyday beauty items together",
            "Refer to individual items for shade and usage details"
        ],

        description: [
            paragraph(
                "Build your everyday routine",
                "Bring your beauty essentials together in one place. This three-item pack fits into your existing routine and keeps your makeup collection easy to organise."
            ),
            paragraph(
                "Product information",
                "Check each item's shade, ingredients and application instructions before use. Follow the individual labels for storage and expiry information."
            )
        ],

        specifications: [
            specification("Product type", "Makeup kit"),
            specification("Pack size", "3 items"),
            specification("Usage", "As directed on individual labels")
        ]
    },

    {
        _id: "preview-kitchen",
        name: "Everyday Dining Set",
        brand: "HomeNest",
        category: "home-kitchen",
        group: "home-kitchen",
        image: image("home-kitchen.webp"),
        price: 1199,
        mrp: 1599,
        stock: 12,
        rating: 4.5,
        ratingCount: 87,
        packLabel: "6 pieces",

        highlights: [
            "Six-piece dining set",
            "Coordinated appearance for your table",
            "Suitable for everyday table arrangements"
        ],

        description: [
            paragraph(
                "Set a coordinated table",
                "Bring a consistent look to your dining space with a six-piece set. Pair it with simple table linen and your existing serving accessories."
            ),
            paragraph(
                "Care instructions",
                "Handle carefully and follow the product's cleaning instructions. Confirm appliance compatibility before placing any piece in a microwave or dishwasher."
            )
        ],

        specifications: [
            specification("Product type", "Dining set"),
            specification("Number of pieces", "6"),
            specification("Appliance compatibility", "Refer to product markings")
        ]
    },

    {
        _id: "preview-backpack",
        name: "Travel and Everyday Backpack",
        brand: "TrailMate",
        category: "backpacks",
        group: "travel",
        image: image("backpacks.jpg"),
        price: 1199,
        mrp: 1599,
        stock: 14,
        rating: 4.4,
        ratingCount: 231,
        variantLabel: "Black · 30 L",

        highlights: [
            "30 L capacity",
            "Versatile Black colour",
            "A practical option for daily essentials and short trips"
        ],

        description: [
            paragraph(
                "Keep your essentials together",
                "Organise what you need for a day out or a short trip in a 30 L backpack. The Black colour pairs easily with everyday clothing and travel accessories."
            ),
            paragraph(
                "Pack for your routine",
                "Arrange heavier items carefully and keep frequently used essentials accessible. Check the bag's dimensions before using it for a particular laptop or airline baggage requirement."
            ),
            paragraph(
                "Care and storage",
                "Empty the bag before cleaning and follow its care label. Allow it to dry fully before storing it in a clean, dry place."
            )
        ],

        specifications: [
            specification("Product type", "Backpack"),
            specification("Capacity", "30 L"),
            specification("Colour", "Black"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-trolley",
        name: "Cabin Trolley Bag",
        brand: "TrailMate",
        category: "trolley-bags",
        group: "travel",
        image: image("trolley-bags.jpg"),
        price: 2499,
        mrp: 3299,
        stock: 9,
        rating: 4.6,
        ratingCount: 76,
        variantLabel: "Cabin · 55 cm",

        highlights: [
            "Listed size: 55 cm",
            "Wheeled trolley format",
            "Suitable for organising short-trip essentials",
            "Check your airline's baggage limits before travel"
        ],

        description: [
            paragraph(
                "Prepare for your next trip",
                "Keep clothing and travel essentials organised in a trolley bag for shorter journeys. The wheeled format makes it convenient to move the bag through your travel routine."
            ),
            paragraph(
                "Check baggage requirements",
                "Cabin baggage allowances vary by airline and fare. Compare the complete bag dimensions and packed weight with your airline's current requirements before travelling."
            )
        ],

        specifications: [
            specification("Product type", "Trolley bag"),
            specification("Listed size", "55 cm"),
            specification("Quantity", "1 unit")
        ]
    },

    {
        _id: "preview-travel",
        name: "Travel Accessories Kit",
        brand: "TrailMate",
        category: "travel-accessories",
        group: "travel",
        image: image("travel-accessories.jpg"),
        price: 599,
        mrp: 799,
        stock: 18,
        rating: 0,
        ratingCount: 0,
        packLabel: "Pack of 4",

        highlights: [
            "Four-item accessories pack",
            "Keep travel essentials organised",
            "A convenient addition to your packing routine"
        ],

        description: [
            paragraph(
                "Organise the smaller essentials",
                "Bring your travel accessories together before heading out. A dedicated kit helps keep smaller essentials separate from clothing and other luggage contents."
            ),
            paragraph(
                "Plan your packing",
                "Check the included items against your trip requirements and pack them where they are easy to reach when needed."
            )
        ],

        specifications: [
            specification("Product type", "Travel accessories kit"),
            specification("Pack size", "4 items")
        ]
    }
];

/*
 * Keep the parent-level display fields aligned with the default
 * variant so older components remain consistent during migration.
 *
 * Only add genuine images for the same product to `images` or to a
 * variant's `images` array. An unrelated product image should not
 * be used as an alternative angle.
 */

export const productCatalog = catalogItems.map((product) => {
    const variants = product.variants ?? [];

    const defaultVariant = variants.find((item) => item.id === product.defaultVariantId);

    if (variants.length > 0 && !defaultVariant) {
        throw new Error(`Product "${product._id}" needs a valid defaultVariantId.`);
    }

    const displayImage = defaultVariant?.image || product.image;

    const galleryImages = [displayImage, ...(defaultVariant?.images ?? product.images ?? [])].filter(Boolean);

    return {
        ...product,
        image: displayImage,
        images: [...new Set(galleryImages)],
        optionGroups: product.optionGroups ?? [],
        variants,
        price: defaultVariant?.price ?? product.price,
        mrp: defaultVariant?.mrp ?? product.mrp,
        stock: defaultVariant?.stock ?? product.stock,
        variantLabel: defaultVariant?.variantLabel ?? product.variantLabel,
        packLabel: defaultVariant?.packLabel ?? product.packLabel
    };
});
