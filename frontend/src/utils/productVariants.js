export function getVariantId(variant) {
    return variant?._id ?? variant?.id ?? null;
}

export function getAvailableStock(item) {
    return Number.isInteger(item?.stock) && item.stock > 0 ? item.stock : 0;
}

export function hasProductVariants(product) {
    return Array.isArray(product?.variants) && product.variants.length > 0;
}

export function findProductVariant(product, variantId) {
    if (variantId == null) return null;

    return product.variants?.find((variant) => getVariantId(variant) === variantId) ?? null;
}

function matchesOptions(variant, options) {
    return Object.entries(options).every(([key, value]) => variant.options?.[key] === value);
}

function getDefaultVariant(product) {
    const variants = product.variants ?? [];

    const configured = findProductVariant(product, product.defaultVariantId);

    if (configured) return configured;

    // Support catalogue entries created before defaultVariantId.
    const label = product.packLabel || product.variantLabel || "";

    const matchingLabel = variants.find((variant) => {
        const values = Object.values(variant.options ?? {});

        return values.length > 0 && values.every((value) => label.includes(String(value)));
    });

    return matchingLabel ?? variants[0] ?? null;
}

// Use for cards. A supplied variant ID remains an exact selection.
export function getDisplayVariant(
    product,
    { variantId, preferredVariantId, matchingOptions = {}, candidates } = {}
) {
    if (!hasProductVariants(product)) return null;

    if (variantId != null) {
        return findProductVariant(product, variantId);
    }

    const allowedIds = candidates == null ? null : new Set(candidates.map(getVariantId));

    const eligible = product.variants.filter(
        (variant) =>
            (!allowedIds || allowedIds.has(getVariantId(variant))) && matchesOptions(variant, matchingOptions)
    );

    if (eligible.length === 0) return null;

    const available = eligible.filter((variant) => getAvailableStock(variant) > 0);

    const pool = available.length > 0 ? available : eligible;

    const preferred = pool.find((variant) => getVariantId(variant) === preferredVariantId);

    const defaultId = getVariantId(getDefaultVariant(product));

    const defaultVariant = pool.find((variant) => getVariantId(variant) === defaultId);

    return preferred ?? defaultVariant ?? pool[0];
}

// An explicit invalid or sold-out URL must never silently switch.
export function resolveProductVariant(product, requestedVariantId) {
    if (!hasProductVariants(product)) {
        return {
            variant: null,
            invalidVariant: requestedVariantId != null
        };
    }

    if (requestedVariantId != null) {
        const variant = findProductVariant(product, requestedVariantId);

        return {
            variant,
            invalidVariant: !variant
        };
    }

    return {
        variant: getDisplayVariant(product),
        invalidVariant: false
    };
}

export function getVariantLabel(product, variant) {
    if (!variant) {
        return product.variantLabel || "";
    }

    if (variant.variantLabel) {
        return variant.variantLabel;
    }

    return (product.optionGroups ?? [])
        .filter((group) => group.key !== "pack")
        .map((group) => {
            const value = variant.options?.[group.key];

            const entry = group.values?.find((item) => item.value === value);

            return entry?.label ?? value;
        })
        .filter((value) => value != null && value !== "")
        .join(" · ");
}

export function getProductView(product, variant = null) {
    const requiresVariant = hasProductVariants(product);

    const selectedVariant = variant ? findProductVariant(product, getVariantId(variant)) : null;

    if (requiresVariant && !selectedVariant) {
        return null;
    }

    const selectedImage = selectedVariant?.image || product.image;

    const extraImages = selectedVariant?.images ?? product.images ?? [];

    const images = [
        ...new Set(
            [selectedImage, ...extraImages].filter((value) => typeof value === "string" && value.length > 0)
        )
    ];

    const stock = getAvailableStock(selectedVariant ?? product);

    return {
        ...product,
        productId: product._id,
        variantId: getVariantId(selectedVariant),
        selectedOptions: { ...(selectedVariant?.options ?? {}) },
        image: selectedImage,
        images,
        price: selectedVariant?.price ?? product.price,
        mrp: selectedVariant?.mrp ?? product.mrp,
        stock,
        availableForPurchase: stock > 0,
        variantLabel: getVariantLabel(product, selectedVariant),
        packLabel: selectedVariant?.packLabel ?? selectedVariant?.options?.pack ?? product.packLabel ?? ""
    };
}

export function getProductPath(productId, variantId = null) {
    const path = `/products/${encodeURIComponent(productId)}`;

    if (variantId == null) return path;

    const params = new URLSearchParams({ variant: variantId });

    return `${path}?${params.toString()}`;
}

export function getCartProduct(product, variant = null) {
    const view = getProductView(product, variant);

    if (!view) return null;

    return {
        _id: view.variantId ? `${view.productId}::${view.variantId}` : view.productId,
        productId: view.productId,
        variantId: view.variantId,
        name: view.name,
        brand: view.brand,
        category: view.category,
        image: view.image,
        price: view.price,
        mrp: view.mrp,
        stock: view.stock,
        variantLabel: view.variantLabel,
        packLabel: view.packLabel,
        selectedOptions: view.selectedOptions,
        productPath: getProductPath(view.productId, view.variantId)
    };
}
