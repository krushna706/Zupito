
import { Link } from "react-router-dom";
import { getProductPath } from "../../utils/productVariants";

// ================== CART ITEMS ==================
function CartItems({ items, cartCount, onQuantityChange, formatPrice }) {
    return (
        <section className="cart-panel cart-items">
            <div className="cart-panel-header">
                <h2>Cart Items <span>({cartCount})</span></h2>
                <small>
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                    Secure shopping
                </small>
            </div>

            <ul className="cart-product-list">
                {items.map((item) => {
                    const {
                        product, quantity, price, mrp, stock,
                        validPrice, available, subtotal, discount,
                    } = item;

                    const details = [...new Set([
                        product.variantLabel,
                        product.packLabel,
                    ].filter(Boolean))].join(" · ");

                    const path = product.productPath || getProductPath(
                        product.productId || product._id,
                        product.variantId
                    );

                    return (
                        <li className="cart-product" key={product._id}>
                            <Link to={path} className="cart-product-image">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} loading="lazy" />
                                ) : (
                                    <i className="fa-regular fa-image" aria-hidden="true" />
                                )}
                            </Link>

                            <div className="cart-product-info">
                                <div className="cart-product-description">
                                    {product.brand && <small>{product.brand}</small>}

                                    <Link to={path} className="cart-product-name">
                                        {product.name}
                                    </Link>

                                    {details && <span className="cart-product-variant">{details}</span>}

                                    <div className="cart-product-price">
                                        <strong>
                                            {validPrice ? formatPrice(price) : "Price unavailable"}
                                        </strong>

                                        {validPrice && mrp > price && (
                                            <del>{formatPrice(mrp)}</del>
                                        )}
                                    </div>
                                </div>

                                {quantity > 1 && validPrice && (
                                    <div className="cart-product-total">
                                        <small>Item total</small>
                                        <strong>{formatPrice(subtotal)}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="cart-product-footer">
                                <div className="cart-product-status">
                                    <span className={available ? "cart-in-stock" : "cart-out-stock"}>
                                        <i
                                            className={available
                                                ? "fa-solid fa-circle-check"
                                                : "fa-solid fa-circle-exclamation"}
                                            aria-hidden="true"
                                        />

                                        {!validPrice ? "Price unavailable"
                                            : stock === 0 ? "Out of stock"
                                                : quantity > stock ? `Only ${stock} available`
                                                    : "In Stock"}
                                    </span>

                                    {discount > 0 && (
                                        <span className="cart-savings">
                                            Save {formatPrice(discount)}
                                        </span>
                                    )}
                                </div>

                                <div className="cart-product-actions">
                                    <div className="cart-quantity" role="group" aria-label={`Quantity for ${product.name}`}>
                                        <button
                                            type="button"
                                            aria-label={`Decrease ${product.name} quantity`}
                                            onClick={() => onQuantityChange(product, -1)}
                                        >
                                            <i className="fa-solid fa-minus" aria-hidden="true" />
                                        </button>

                                        <span aria-live="polite">{quantity}</span>

                                        <button
                                            type="button"
                                            disabled={!validPrice || quantity >= stock}
                                            aria-label={`Increase ${product.name} quantity`}
                                            onClick={() => onQuantityChange(product, 1)}
                                        >
                                            <i className="fa-solid fa-plus" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="cart-remove"
                                        onClick={() => onQuantityChange(product, -quantity)}
                                    >
                                        <i className="fa-regular fa-trash-can" aria-hidden="true" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

export default CartItems;
