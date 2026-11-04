
import { useNavigate } from "react-router-dom";

// ================== CART SUMMARY ==================
function CartSummary({ cartCount, subtotal, discount, canCheckout, formatPrice }) {
    const navigate = useNavigate();

    return (
        <aside className="cart-panel cart-summary">
            <div className="cart-panel-header">
                <h2>Price Details</h2>
            </div>

            <div className="cart-summary-content">
                <div className="cart-summary-list">
                    <div className="cart-summary-row">
                        <span>Price ({cartCount} {cartCount === 1 ? "item" : "items"})</span>
                        <strong>{formatPrice(subtotal + discount)}</strong>
                    </div>

                    {discount > 0 && (
                        <div className="cart-summary-row cart-summary-discount">
                            <span>Product Discount</span>
                            <strong>-{formatPrice(discount)}</strong>
                        </div>
                    )}

                    <div className="cart-summary-row">
                        <span>Delivery Charges</span>
                        <span className="cart-summary-muted">At checkout</span>
                    </div>
                </div>

                <div className="cart-summary-total">
                    <strong>Subtotal</strong>
                    <strong>{formatPrice(subtotal)}</strong>
                </div>

                {discount > 0 && (
                    <div className="cart-summary-savings">
                        <i className="fa-solid fa-tag" aria-hidden="true" />
                        You're saving {formatPrice(discount)} on these products
                    </div>
                )}

                {!canCheckout && (
                    <p className="cart-summary-error" role="alert">
                        Some items have insufficient stock or unavailable prices.
                        Please update your cart.
                    </p>
                )}

                <button
                    type="button"
                    className="cart-primary"
                    disabled={!canCheckout}
                    onClick={() => navigate("/checkout")}
                >
                    Proceed to Checkout
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>

                <p className="cart-summary-secure">
                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                    Secure Checkout
                </p>

                <p className="cart-summary-note">
                    Final delivery charges and taxes will be calculated at checkout.
                </p>
            </div>
        </aside>
    );
}

export default CartSummary;
