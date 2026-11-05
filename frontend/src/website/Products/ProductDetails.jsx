import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Rating } from "@mui/material";

import { useCart } from "../../context/CartContext";
import { productCatalog } from "../../data/productCatalog";
import {
    getCartProduct,
    getDisplayVariant,
    getProductPath,
    getProductView,
    resolveProductVariant
} from "../../utils/productVariants";

import ProductGallery from "./ProductGallery";
import VariantSelector from "./VariantSelector";
import ProductReviews from "./ProductReviews";
import ProductSections from "../Home/ProductSections";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
}).format;

function ProductUnavailable({ product }) {
    return (
        <section className="product-details-page">
            <div className="container-fluid website-shell">
                <div className="products-empty">
                    <i className="fa-solid fa-box-open" aria-hidden="true" />
                    <h1>{product ? "Variant unavailable" : "Product unavailable"}</h1>
                    <p>
                        {product
                            ? "This product option could not be found. You can view the available options below."
                            : "This product could not be found."}
                    </p>

                    <Link
                        to={product ? getProductPath(product._id) : "/products"}
                        className="home-categories-view-all"
                        replace
                    >
                        {product ? "View Available Options" : "Browse Products"}
                    </Link>
                </div>
            </div>
        </section>
    );
}

function ProductDetails() {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();

    const product = productCatalog.find((item) => item._id === productId);

    if (!product) return <ProductUnavailable />;

    const { variant, invalidVariant } = resolveProductVariant(product, searchParams.get("variant"));

    if (invalidVariant) return <ProductUnavailable product={product} />;

    return <ProductContent key={product._id} product={product} selectedVariant={variant} />;
}

function ProductContent({ product, selectedVariant }) {
    const navigate = useNavigate();
    const { getQuantity, changeQuantity } = useCart();
    const [expanded, setExpanded] = useState(false);

    const view = getProductView(product, selectedVariant);
    const cartProduct = getCartProduct(product, selectedVariant);

    const similarSections = useMemo(() => {
        const related = productCatalog
            .filter(
                (item) =>
                    item._id !== product._id &&
                    (item.category === product.category || (product.group && item.group === product.group))
            )
            .map((item) => getProductView(item, getDisplayVariant(item)))
            .filter((item) => item?.availableForPurchase);

        const products = [
            ...related.filter((item) => item.category === product.category),
            ...related.filter((item) => item.category !== product.category)
        ].slice(0, 12);

        return products.length
            ? [
                  {
                      key: `similar-${product._id}`,
                      title: "Similar Products",
                      viewAllPath: `/products?category=${encodeURIComponent(product.category)}`,
                      products
                  }
              ]
            : [];
    }, [product]);

    if (!view || !cartProduct) return <ProductUnavailable product={product} />;

    const { price, mrp, stock, variantLabel, packLabel } = view;
    const quantity = getQuantity(cartProduct._id);

    const hasValidPrice = Number.isFinite(price) && price >= 0;
    const canPurchase = hasValidPrice && stock > 0;
    const hasDiscount = hasValidPrice && Number.isFinite(mrp) && mrp > price;
    const discount = hasDiscount ? Math.floor(((mrp - price) / mrp) * 100) : 0;

    const hasRating =
        Number.isFinite(product.rating) &&
        product.rating >= 0 &&
        product.rating <= 5 &&
        Number.isInteger(product.ratingCount) &&
        product.ratingCount > 0;

    const selectedDetail = [...new Set([variantLabel, packLabel].filter(Boolean))].join(" · ");
    const accessibleName = selectedDetail ? `${product.name}, ${selectedDetail}` : product.name;

    const description = Array.isArray(product.description)
        ? product.description
        : product.description
          ? [{ title: "", text: product.description }]
          : [];

    const visibleDescription = expanded ? description : description.slice(0, 2);

    const specifications = [
        ...(product.brand ? [{ label: "Brand", value: product.brand }] : []),
        ...(product.specifications ?? []).filter((item) => item.label?.toLowerCase() !== "brand")
    ];

    const addToCart = () => {
        if (canPurchase && quantity < stock) changeQuantity(cartProduct, 1);
    };

    const buyNow = () => {
        if (!canPurchase || quantity > stock) return;
        if (quantity === 0) changeQuantity(cartProduct, 1);
        navigate("/checkout");
    };

    return (
        <div className="product-details-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/products">Products</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">{product.name}</span>
                </nav>

                <div className="product-details-layout">
                    <div className="product-details-gallery">
                        <ProductGallery
                            key={cartProduct._id}
                            productId={product._id}
                            name={accessibleName}
                            image={view.image}
                            images={view.images}
                        />
                    </div>

                    <section className="product-details-info" aria-labelledby="product-details-title">
                        {product.brand && <span className="product-details-brand">{product.brand}</span>}

                        <h1 id="product-details-title">{product.name}</h1>

                        <div className="product-details-rating">
                            {hasRating ? (
                                <>
                                    <Rating
                                        value={product.rating}
                                        precision={0.1}
                                        readOnly
                                        getLabelText={(value) => `${value} out of 5 stars`}
                                    />
                                    <strong>{product.rating.toFixed(1)}</strong>
                                    <span>({product.ratingCount.toLocaleString("en-IN")} ratings)</span>
                                </>
                            ) : (
                                <span>Not rated yet</span>
                            )}
                        </div>

                        {/* Product Price */}
                        <div className="product-details-price-panel" aria-live="polite" aria-atomic="true">
                            <div className="product-details-pricing">
                                <span className="product-details-price">
                                    {hasValidPrice ? (
                                        <>
                                            <span className="visually-hidden">Price:</span>
                                            {formatPrice(price)}
                                        </>
                                    ) : (
                                        "Price unavailable"
                                    )}
                                </span>

                                {hasDiscount && (
                                    <>
                                        <del className="product-details-mrp">
                                            <span className="visually-hidden">MRP:</span>
                                            {formatPrice(mrp)}
                                        </del>
                                        <span className="product-details-discount">{discount}% off</span>
                                    </>
                                )}
                            </div>

                            {hasDiscount && (
                                <p className="product-details-savings">You save {formatPrice(mrp - price)}</p>
                            )}
                        </div>

                        {/* Product Variants */}
                        <VariantSelector product={product} selectedVariant={selectedVariant} />

                        <p
                            className={`product-details-stock ${stock > 0 ? "is-available" : "is-unavailable"}`}
                            aria-live="polite"
                        >
                            {stock > 0 ? "In stock" : "Out of stock"}
                        </p>

                        {quantity > stock && (
                            <p className="product-selection-note" role="status">
                                Your cart quantity exceeds the current stock. Please reduce it before
                                checkout.
                            </p>
                        )}

                        {/* Purchase Actions */}
                        <div className="product-details-purchase">
                            {quantity > 0 ? (
                                <div className="product-details-quantity-block">
                                    <span>Quantity</span>

                                    <div
                                        className="product-quantity"
                                        role="group"
                                        aria-label={`Quantity for ${accessibleName}`}
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Decrease quantity of ${accessibleName}`}
                                            onClick={() => changeQuantity(cartProduct, -1)}
                                        >
                                            <i className="fa-solid fa-minus" aria-hidden="true" />
                                        </button>

                                        <span aria-live="polite" aria-atomic="true">
                                            {quantity}
                                        </span>

                                        <button
                                            type="button"
                                            aria-label={`Increase quantity of ${accessibleName}`}
                                            disabled={!canPurchase || quantity >= stock}
                                            onClick={addToCart}
                                        >
                                            <i className="fa-solid fa-plus" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="product-details-add"
                                    disabled={!canPurchase}
                                    onClick={addToCart}
                                >
                                    <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                                    {stock === 0 ? "Out of stock" : "Add to Cart"}
                                </button>
                            )}

                            <button
                                type="button"
                                className="product-details-buy"
                                disabled={!canPurchase || quantity > stock}
                                onClick={buyNow}
                            >
                                Buy Now
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Product Highlights */}
                        {product.highlights?.length > 0 && (
                            <div className="product-details-highlights">
                                <h2>Key highlights</h2>
                                <ul>
                                    {product.highlights.map((highlight, index) => (
                                        <li key={`${index}-${highlight}`}>{highlight}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>

                {/* Description */}
                {description.length > 0 && (
                    <section className="product-details-overview" aria-labelledby="product-description-title">
                        <h2 id="product-description-title">About this product</h2>

                        <div id={`description-${product._id}`}>
                            {visibleDescription.map((paragraph, index) => (
                                <div
                                    className="product-description-block"
                                    key={`${paragraph.title}-${index}`}
                                >
                                    {paragraph.title && <h3>{paragraph.title}</h3>}
                                    <p>{paragraph.text}</p>
                                </div>
                            ))}
                        </div>

                        {description.length > 2 && (
                            <button
                                type="button"
                                className="product-selection-clear"
                                aria-expanded={expanded}
                                aria-controls={`description-${product._id}`}
                                onClick={() => setExpanded((value) => !value)}
                            >
                                {expanded ? "Show less" : "Read more"}
                            </button>
                        )}
                    </section>
                )}

                {/* Specifications */}
                {specifications.length > 0 && (
                    <section
                        className="product-details-overview"
                        aria-labelledby="product-specifications-title"
                    >
                        <h2 id="product-specifications-title">Specifications</h2>

                        <dl className="product-details-specifications">
                            {specifications.map((item, index) => (
                                <div key={`${item.label}-${index}`}>
                                    <dt>{item.label}</dt>
                                    <dd>{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {/* Customer Reviews */}
                <ProductReviews product={product} />
            </div>

            {/* Similar Products */}
            {similarSections.length > 0 && <ProductSections sections={similarSections} />}
        </div>
    );
}

export default ProductDetails;
