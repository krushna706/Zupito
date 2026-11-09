import { Link } from "react-router-dom";

import { useCart } from "../context/CartContext";
import {
    getCartProduct,
    getDisplayVariant,
    getProductPath,
    getProductView
} from "../utils/productVariants";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

function ProductRating({ rating, ratingCount }) {
    const hasRating =
        Number.isFinite(rating) &&
        rating >= 0 &&
        rating <= 5 &&
        Number.isInteger(ratingCount) &&
        ratingCount > 0;

    if (!hasRating) {
        return (
            <div className="product-card-rating product-card-rating-empty">
                Not rated yet
            </div>
        );
    }

    return (
        <div
            className="product-card-rating"
            aria-label={`${rating} out of 5 stars, ${ratingCount} ratings`}
            title={`${rating} out of 5 · ${ratingCount.toLocaleString("en-IN")} ratings`}
        >
            <span className="product-card-stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => {
                    const fill = Math.min(
                        100,
                        Math.max(0, (rating - index) * 100)
                    );

                    return (
                        <span className="product-card-star" key={index}>
                            <i className="fa-solid fa-star" />

                            <span
                                className="product-card-star-fill"
                                style={{ width: `${fill}%` }}
                            >
                                <i className="fa-solid fa-star" />
                            </span>
                        </span>
                    );
                })}
            </span>

            <span className="product-card-rating-count" aria-hidden="true">
                ({ratingCount.toLocaleString("en-IN")})
            </span>
        </div>
    );
}

function ProductCard({ product, variantId, preferredVariantId }) {
    const { getQuantity, changeQuantity } = useCart();

    const selectedVariant = getDisplayVariant(product, {
        variantId: variantId ?? product.variantId,
        preferredVariantId
    });

    const view = getProductView(product, selectedVariant);
    const cartProduct = getCartProduct(product, selectedVariant);

    // Do not show another variant when an explicit selection is invalid.
    if (!view || !cartProduct) return null;

    const {
        name,
        price,
        mrp,
        stock,
        rating,
        ratingCount,
        variantLabel,
        packLabel,
        availableForPurchase
    } = view;

    // Cards use the product cover; variant images remain available separately.
    const image = view.coverImage || view.image;

    const quantity = getQuantity(cartProduct._id);

    const productPath = getProductPath(view.productId, view.variantId);

    const productDetail = [
        ...new Set([variantLabel, packLabel].filter(Boolean))
    ].join(" · ");

    const accessibleName = productDetail
        ? `${name}, ${productDetail}`
        : name;

    const hasValidPrice = Number.isFinite(price) && price >= 0;

    const canPurchase = availableForPurchase && hasValidPrice;

    const hasDiscount =
        hasValidPrice &&
        Number.isFinite(mrp) &&
        mrp > price;

    const discountPercent = hasDiscount
        ? Math.floor(((mrp - price) / mrp) * 100)
        : 0;

    return (
        <article className="product-card">
            <Link
                to={productPath}
                className="product-card-link"
                aria-label={`View ${accessibleName}`}
                draggable={false}
            >
                <div className="product-card-image">
                    {image ? (
                        <img
                            src={image}
                            alt=""
                            width="400"
                            height="400"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                        />
                    ) : (
                        <span className="product-card-placeholder">
                            <i
                                className="fa-regular fa-image"
                                aria-hidden="true"
                            />
                            <span>Image unavailable</span>
                        </span>
                    )}

                    {discountPercent > 0 && (
                        <span className="product-card-discount">
                            {discountPercent}% off
                        </span>
                    )}
                </div>

                <div className="product-card-content">
                    <h3 className="product-card-name" title={name}>
                        {name}
                    </h3>

                    <div
                        className="product-card-detail"
                        title={productDetail || undefined}
                    >
                        {productDetail || "\u00A0"}
                    </div>

                    <ProductRating
                        rating={rating}
                        ratingCount={ratingCount}
                    />

                    <div className="product-card-pricing">
                        <span className="product-card-price">
                            {hasValidPrice ? (
                                <>
                                    <span className="visually-hidden">
                                        Price:
                                    </span>
                                    {currencyFormatter.format(price)}
                                </>
                            ) : (
                                "Price unavailable"
                            )}
                        </span>

                        {hasDiscount && (
                            <del className="product-card-mrp">
                                <span className="visually-hidden">
                                    MRP:
                                </span>
                                {currencyFormatter.format(mrp)}
                            </del>
                        )}
                    </div>
                </div>
            </Link>

            <div className="product-card-footer">
                {quantity > 0 ? (
                    <div
                        className="product-quantity"
                        role="group"
                        aria-label={`Quantity for ${accessibleName}`}
                    >
                        <button
                            type="button"
                            onClick={() => changeQuantity(cartProduct, -1)}
                            aria-label={`Decrease quantity of ${accessibleName}`}
                        >
                            <i
                                className="fa-solid fa-minus"
                                aria-hidden="true"
                            />
                        </button>

                        <span aria-live="polite" aria-atomic="true">
                            <span className="visually-hidden">
                                Quantity:
                            </span>
                            {quantity}
                        </span>

                        <button
                            type="button"
                            onClick={() => changeQuantity(cartProduct, 1)}
                            disabled={!canPurchase || quantity >= stock}
                            aria-label={`Increase quantity of ${accessibleName}`}
                        >
                            <i
                                className="fa-solid fa-plus"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="product-add-button"
                        onClick={() => changeQuantity(cartProduct, 1)}
                        disabled={!canPurchase}
                        aria-label={
                            canPurchase
                                ? `Add ${accessibleName} to cart`
                                : `${accessibleName} is unavailable`
                        }
                    >
                        {canPurchase ? (
                            <>
                                <i
                                    className="fa-solid fa-plus"
                                    aria-hidden="true"
                                />
                                Add to Cart
                            </>
                        ) : availableForPurchase ? (
                            "Unavailable"
                        ) : (
                            "Out of stock"
                        )}
                    </button>
                )}
            </div>
        </article>
    );
}

export default ProductCard;