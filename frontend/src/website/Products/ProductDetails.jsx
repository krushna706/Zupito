import { useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { Rating } from "@mui/material";

import { useCart } from "../../context/CartContext";
import { productCatalog } from "../../data/productCatalog";
import {
    getAvailableStock,
    getCartProduct,
    getDisplayVariant,
    getProductPath,
    getProductView,
    getVariantId,
    resolveProductVariant,
} from "../../utils/productVariants";
import ProductGallery from "./ProductGallery";
import ProductReviews from "./ProductReviews";
import ProductSections from "../Home/ProductSections";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

function ProductUnavailable({ product }) {
    return (
        <section className="product-details-page">
            <div className="container-fluid website-shell">
                <div className="products-empty">
                    <i
                        className="fa-solid fa-box-open"
                        aria-hidden="true"
                    />

                    <h1>
                        {product ? "Variant unavailable" : "Product unavailable"}
                    </h1>

                    <p>
                        {product
                            ? "This product option could not be found. You can view the available options below."
                            : "This product could not be found."}
                    </p>

                    <Link
                        to={product
                            ? getProductPath(product._id)
                            : "/products"}
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

    const product = productCatalog.find(
        (item) => item._id === productId
    );

    if (!product) {
        return <ProductUnavailable />;
    }

    const { variant, invalidVariant } = resolveProductVariant(
        product,
        searchParams.get("variant")
    );

    if (invalidVariant) {
        return <ProductUnavailable product={product} />;
    }

    return (
        <ProductContent
            key={product._id}
            product={product}
            selectedVariant={variant}
        />
    );
}

function ProductContent({ product, selectedVariant }) {
    const navigate = useNavigate();
    const [, setSearchParams] = useSearchParams();
    const { getQuantity, changeQuantity } = useCart();

    const [expanded, setExpanded] = useState(false);
    const [selectionNotice, setSelectionNotice] = useState(null);

    const optionGroups = product.optionGroups ?? [];
    const variants = product.variants ?? [];
    const selection = selectedVariant?.options ?? {};

    const view = getProductView(product, selectedVariant);
    const cartProduct = getCartProduct(product, selectedVariant);

    const similarSections = useMemo(() => {
        const related = productCatalog
            .filter((item) => (
                item._id !== product._id
                && (
                    item.category === product.category
                    || (product.group && item.group === product.group)
                )
            ))
            .map((item) => getProductView(
                item,
                getDisplayVariant(item)
            ))
            .filter((item) => item?.availableForPurchase);

        const exactMatches = related.filter(
            (item) => item.category === product.category
        );

        const broaderMatches = related.filter(
            (item) => item.category !== product.category
        );

        const products = [
            ...exactMatches,
            ...broaderMatches,
        ].slice(0, 12);

        if (products.length === 0) return [];

        return [{
            key: `similar-${product._id}`,
            title: "Similar Products",
            viewAllPath: `/products?category=${
                encodeURIComponent(product.category)
            }`,
            products,
        }];
    }, [product]);

    if (!view || !cartProduct) {
        return <ProductUnavailable product={product} />;
    }

    const {
        price,
        mrp,
        stock,
        variantId,
        variantLabel,
        packLabel,
    } = view;

    const quantity = getQuantity(cartProduct._id);
    const hasValidPrice = Number.isFinite(price) && price >= 0;
    const canPurchase = stock > 0 && hasValidPrice;

    const hasDiscount =
        hasValidPrice
        && Number.isFinite(mrp)
        && mrp > price;

    const discount = hasDiscount
        ? Math.floor(((mrp - price) / mrp) * 100)
        : 0;

    const hasRating =
        Number.isFinite(product.rating)
        && product.rating >= 0
        && product.rating <= 5
        && Number.isInteger(product.ratingCount)
        && product.ratingCount > 0;

    const selectedDetail = [
        ...new Set([variantLabel, packLabel].filter(Boolean)),
    ].join(" · ");

    const accessibleName = selectedDetail
        ? `${product.name}, ${selectedDetail}`
        : product.name;

    const description = Array.isArray(product.description)
        ? product.description
        : product.description
            ? [{ title: "", text: product.description }]
            : [];

    const visibleDescription = expanded
        ? description
        : description.slice(0, 2);

    const specifications = [
        ...(product.brand
            ? [{ label: "Brand", value: product.brand }]
            : []),
        ...(product.specifications ?? []).filter(
            (item) => item.label?.toLowerCase() !== "brand"
        ),
    ];

    const activeNotice = selectionNotice?.variantId === variantId
        ? selectionNotice.text
        : "";

    const getOptionLabel = (group, value) => (
        group.values?.find((item) => item.value === value)?.label
        ?? value
    );

    const getOptionVariant = (key, value) => {
        const candidates = variants.filter(
            (variant) => variant.options?.[key] === value
        );

        if (candidates.length === 0) return null;

        // Preserve other selected options when the combination exists.
        const exactMatch = candidates.find((variant) => (
            Object.entries(selection).every(
                ([selectedKey, selectedValue]) => (
                    selectedKey === key
                    || variant.options?.[selectedKey] === selectedValue
                )
            )
        ));

        if (exactMatch) return exactMatch;

        // For a missing combination, prefer an available close match.
        const available = candidates.filter(
            (variant) => getAvailableStock(variant) > 0
        );

        const pool = available.length > 0 ? available : candidates;

        const matchCount = (variant) => (
            Object.entries(selection).filter(
                ([selectedKey, selectedValue]) => (
                    selectedKey !== key
                    && variant.options?.[selectedKey] === selectedValue
                )
            ).length
        );

        return pool.reduce((best, variant) => (
            matchCount(variant) > matchCount(best) ? variant : best
        ));
    };

    const chooseOption = (group, value) => {
        if (selection[group.key] === value) return;

        const nextVariant = getOptionVariant(group.key, value);
        if (!nextVariant) return;

        const nextVariantId = getVariantId(nextVariant);

        const changedOptions = optionGroups
            .filter((item) => (
                item.key !== group.key
                && selection[item.key] !== nextVariant.options?.[item.key]
            ))
            .map((item) => (
                `${item.label}: ${
                    getOptionLabel(item, nextVariant.options?.[item.key])
                }`
            ));

        setSelectionNotice(changedOptions.length > 0
            ? {
                variantId: nextVariantId,
                text: `Updated to ${changedOptions.join(", ")} to match this option.`,
            }
            : null);

        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("variant", nextVariantId);
            return next;
        });
    };

    const addToCart = () => {
        if (canPurchase && quantity < stock) {
            changeQuantity(cartProduct, 1);
        }
    };

    const buyNow = () => {
        if (!canPurchase || quantity > stock) return;

        if (quantity === 0) {
            changeQuantity(cartProduct, 1);
        }

        navigate("/checkout");
    };

    return (
        <div className="product-details-page">
            <div className="container-fluid website-shell">
                <nav
                    className="products-breadcrumb"
                    aria-label="Breadcrumb"
                >
                    <Link to="/">Home</Link>
                    <i
                        className="fa-solid fa-chevron-right"
                        aria-hidden="true"
                    />
                    <Link to="/products">Products</Link>
                    <i
                        className="fa-solid fa-chevron-right"
                        aria-hidden="true"
                    />
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

                    <section
                        className="product-details-info"
                        aria-labelledby="product-details-title"
                    >
                        {product.brand && (
                            <span className="product-details-brand">
                                {product.brand}
                            </span>
                        )}

                        <h1 id="product-details-title">
                            {product.name}
                        </h1>

                        <div className="product-details-rating">
                            {hasRating ? (
                                <>
                                    <Rating
                                        value={product.rating}
                                        precision={0.1}
                                        readOnly
                                        getLabelText={(value) => (
                                            `${value} out of 5 stars`
                                        )}
                                        sx={{ color: "#b77912" }}
                                    />
                                    <strong>
                                        {product.rating.toFixed(1)}
                                    </strong>
                                    <span>
                                        ({product.ratingCount.toLocaleString(
                                            "en-IN"
                                        )} ratings)
                                    </span>
                                </>
                            ) : (
                                <span>Not rated yet</span>
                            )}
                        </div>

                        <div
                            className="product-details-price-panel"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <div className="product-details-pricing">
                                <span className="product-details-price">
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
                                    <>
                                        <del className="product-details-mrp">
                                            <span className="visually-hidden">
                                                MRP:
                                            </span>
                                            {currencyFormatter.format(mrp)}
                                        </del>
                                        <span className="product-details-discount">
                                            {discount}% off
                                        </span>
                                    </>
                                )}
                            </div>

                            {hasDiscount && (
                                <p className="product-details-savings">
                                    You save {currencyFormatter.format(
                                        mrp - price
                                    )}
                                </p>
                            )}

                        </div>

                        {variants.length > 0 && (
                            <div className="product-variant-groups">
                                {optionGroups.map((group) => (
                                    <fieldset
                                        key={group.key}
                                        className="product-variant-group"
                                    >
                                        <legend>
                                            {group.label}
                                            {selection[group.key] != null && (
                                                <span>
                                                    : {getOptionLabel(
                                                        group,
                                                        selection[group.key]
                                                    )}
                                                </span>
                                            )}
                                        </legend>

                                        <div className="product-variant-values">
                                            {group.values.map((option) => {
                                                const selected =
                                                    selection[group.key]
                                                    === option.value;

                                                const target = getOptionVariant(
                                                    group.key,
                                                    option.value
                                                );

                                                const label =
                                                    option.label ?? option.value;

                                                const soldOut = target
                                                    && getAvailableStock(target) === 0;

                                                const title = !target
                                                    ? `${label} — unavailable`
                                                    : soldOut
                                                        ? `${label} — out of stock`
                                                        : String(label);

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={`product-variant-button ${
                                                            selected
                                                                ? "is-selected"
                                                                : ""
                                                        }`}
                                                        aria-pressed={selected}
                                                        aria-label={`${group.label}: ${title}`}
                                                        disabled={!target}
                                                        title={title}
                                                        onClick={() => chooseOption(
                                                            group,
                                                            option.value
                                                        )}
                                                    >
                                                        {option.swatch && (
                                                            <span
                                                                className="product-colour-swatch"
                                                                style={{
                                                                    backgroundColor:
                                                                        option.swatch,
                                                                }}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                ))}

                                {activeNotice && (
                                    <p
                                        className="product-selection-note"
                                        role="status"
                                    >
                                        {activeNotice}
                                    </p>
                                )}
                            </div>
                        )}

                        <p
                            className={`product-details-stock ${
                                stock > 0
                                    ? "is-available"
                                    : "is-unavailable"
                            }`}
                            aria-live="polite"
                        >
                            {stock > 0 ? "In stock" : "Out of stock"}
                        </p>

                        {quantity > stock && (
                            <p
                                className="product-selection-note"
                                role="status"
                            >
                                Your cart quantity exceeds the current stock.
                                Please reduce it before checkout.
                            </p>
                        )}

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
                                            onClick={() => {
                                                changeQuantity(cartProduct, -1);
                                            }}
                                        >
                                            <i
                                                className="fa-solid fa-minus"
                                                aria-hidden="true"
                                            />
                                        </button>

                                        <span
                                            aria-live="polite"
                                            aria-atomic="true"
                                        >
                                            {quantity}
                                        </span>

                                        <button
                                            type="button"
                                            aria-label={`Increase quantity of ${accessibleName}`}
                                            disabled={!canPurchase || quantity >= stock}
                                            onClick={addToCart}
                                        >
                                            <i
                                                className="fa-solid fa-plus"
                                                aria-hidden="true"
                                            />
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
                                    <i
                                        className="fa-solid fa-cart-plus"
                                        aria-hidden="true"
                                    />
                                    {stock === 0
                                        ? "Out of stock"
                                        : "Add to Cart"}
                                </button>
                            )}

                            <button
                                type="button"
                                className="product-details-buy"
                                disabled={!canPurchase || quantity > stock}
                                onClick={buyNow}
                            >
                                Buy Now
                                <i
                                    className="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>


                        {product.highlights?.length > 0 && (
                            <div className="product-details-highlights">
                                <h2>Key highlights</h2>
                                <ul>
                                    {product.highlights.map((highlight, index) => (
                                        <li key={`${index}-${highlight}`}>
                                            {highlight}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>

                {description.length > 0 && (
                    <section
                        className="product-details-overview"
                        aria-labelledby="product-description-title"
                    >
                        <h2 id="product-description-title">
                            About this product
                        </h2>

                        <div id={`description-${product._id}`}>
                            {visibleDescription.map((paragraph, index) => (
                                <div
                                    className="product-description-block"
                                    key={`${paragraph.title}-${index}`}
                                >
                                    {paragraph.title && (
                                        <h3>{paragraph.title}</h3>
                                    )}
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
                                onClick={() => {
                                    setExpanded((current) => !current);
                                }}
                            >
                                {expanded ? "Show less" : "Read more"}
                            </button>
                        )}
                    </section>
                )}

                {specifications.length > 0 && (
                    <section
                        className="product-details-overview"
                        aria-labelledby="product-specifications-title"
                    >
                        <h2 id="product-specifications-title">
                            Specifications
                        </h2>

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

                <ProductReviews product={product} />
            </div>

            {similarSections.length > 0 && (
                <ProductSections sections={similarSections} />
            )}

        </div>
    );
}

export default ProductDetails;