import api from "./api";

function mapProduct(product) {
    const images = product.images || [];

    const variants = product.variants.map((variant) => ({
        id: variant.variantId,
        variantLabel: variant.label,
        options: { option: variant.variantId },

        price: variant.pricePaise / 100,
        mrp: variant.mrpPaise / 100,
        stock: variant.availableStock,

        image: images[variant.imageIndex] || images[0],
    }));

    return {
        ...product,
        images,
        image: images[0] || "",

        // Preserve the seller-selected cover when resolving variant images.
        coverImage: images[0] || "",

        variants,

        variantId: product.displayVariantId,
        defaultVariantId: product.displayVariantId,

        optionGroups: [
            {
                key: "option",
                label: "Choose option",
                values: product.variants.map((variant) => ({
                    value: variant.variantId,
                    label: variant.label,
                })),
            },
        ],

        rating: null,
        ratingCount: 0,
        reviews: [],
    };
}

export async function getPublicProducts(params = {}) {
    const { data } = await api.get("/products", { params });

    return {
        ...data,
        products: data.products.map(mapProduct),
    };
}

export async function getPublicProduct(productId) {
    const { data } = await api.get(
        `/products/${encodeURIComponent(productId)}`
    );

    return {
        product: mapProduct(data.product),
        related: data.related.map(mapProduct),
    };
}