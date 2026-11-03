import { Link } from "react-router-dom";

import { useCart } from "../context/CartContext";

// ================== PRICE FORMAT ==================
const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

function ProductRating({ rating, ratingCount }) {
    const count = Number.isInteger(ratingCount) && ratingCount > 0
        ? ratingCount
        : 0;

    const hasRating = Number.isFinite(rating)
        && rating >= 0
        && rating <= 5
        && count > 0;

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
            aria-label={`${rating} out of 5 stars, ${count} ratings`}
            title={`${rating} out of 5 · ${count.toLocaleString("en-IN")} ratings`}
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
                ({count.toLocaleString("en-IN")})
            </span>
        </div>
    );
}

// ================== PRODUCT CARD ==================
function ProductCard({ product }) {
    const { getQuantity, changeQuantity } = useCart();
   const {
        _id,
        name,
        image,
        price,
        mrp,
        stock,
        rating,
        ratingCount,
        packLabel,
        variantLabel,
    } = product;

    const productDetail = packLabel || variantLabel;

    const quantity = getQuantity(_id);
    const hasDiscount = Number.isFinite(mrp) && mrp > price;
    const discountPercent = hasDiscount
        ? Math.floor(((mrp - price) / mrp) * 100)
        : 0;

    const availableStock = Number.isInteger(stock) && stock > 0 ? stock : 0;
    const productPath = `/products/${encodeURIComponent(_id)}`;

    return (
        <article className="product-card">
            <Link
                to={productPath}
                className="product-card-link"
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
                            <i className="fa-regular fa-image" aria-hidden="true" />
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

                    <div className="product-card-detail" title={productDetail || undefined}>
                        {productDetail || "\u00A0"}
                    </div>

                    <ProductRating rating={rating} ratingCount={ratingCount} />

                    <div className="product-card-pricing">
                        <span className="product-card-price">
                            <span className="visually-hidden">Price: </span>
                            {currencyFormatter.format(price)}
                        </span>

                        {hasDiscount && (
                            <del className="product-card-mrp">
                                <span className="visually-hidden">MRP: </span>
                                {currencyFormatter.format(mrp)}
                            </del>
                        )}
                    </div>
                </div>
            </Link>

            {/* Keep cart controls outside the product link. */}
            <div className="product-card-footer">
                {quantity > 0 ? (
                    <div
                        className="product-quantity"
                        role="group"
                        aria-label={`Quantity for ${name}`}
                    >
                        <button
                            type="button"
                            onClick={() => changeQuantity(product, -1)}
                            aria-label={`Decrease quantity of ${name}`}
                        >
                            <i className="fa-solid fa-minus" aria-hidden="true" />
                        </button>

                        <span aria-live="polite" aria-atomic="true">
                            <span className="visually-hidden">Quantity: </span>
                            {quantity}
                        </span>

                        <button
                            type="button"
                            onClick={() => changeQuantity(product, 1)}
                            disabled={quantity >= availableStock}
                            aria-label={`Increase quantity of ${name}`}
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="product-add-button"
                        onClick={() => changeQuantity(product, 1)}
                        disabled={!availableStock}
                        aria-label={
                            availableStock
                                ? `Add ${name} to cart`
                                : `${name} is out of stock`
                        }
                    >
                        {availableStock ? (
                            <>
                                <i className="fa-solid fa-plus" aria-hidden="true" />
                                Add to Cart
                            </>
                        ) : "Out of stock"}
                    </button>
                )}
            </div>
        </article>
    );
}

export default ProductCard;