import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useCart } from "../../context/CartContext";
import CartItems from "./CartItems";
import CartSummary from "./CartSummary";

const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
});

const formatPrice = (value) => formatter.format(value);

function Cart() {
    const {
        items,
        cartCount,
        subtotal,
        discount,
        canCheckout,
        loading,
        updating,
        ready,
        error,
        changeQuantity,
        refreshCart
    } = useCart();

    const navigate = useNavigate();

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    const handleCheckout = async () => {
        const next = await refreshCart();

        if (!next) return;

        if (!next.canCheckout) {
            toast.error(
                "Please resolve unavailable items before checkout."
            );
            return;
        }

        const changed =
            next.items.length !== items.length ||
            next.items.some((item) => {
                const previous = items.find(
                    (entry) =>
                        entry.product._id === item.product._id
                );

                return (
                    !previous ||
                    previous.quantity !== item.quantity ||
                    previous.product.price !== item.product.price ||
                    previous.product.mrp !== item.product.mrp
                );
            });

        if (changed) {
            toast.info(
                "Your cart has changed. Review the updated prices and quantities, then continue."
            );
            return;
        }

        navigate("/checkout");
    };

    const cartItems = items.map(({ product, quantity }) => {
        const rawPrice = Number(product.price);
        const rawMrp = Number(product.mrp);
        const rawStock = Number(product.stock);

        const validPrice =
            product.validPrice !== false &&
            Number.isFinite(rawPrice) &&
            rawPrice >= 0;

        const price = validPrice ? rawPrice : 0;

        const mrp =
            Number.isFinite(rawMrp) && rawMrp > price
                ? rawMrp
                : price;

        const stock =
            Number.isInteger(rawStock) && rawStock >= 0
                ? rawStock
                : 0;

        return {
            product,
            quantity,
            price,
            mrp,
            stock,
            validPrice,
            available:
                product.availableForPurchase &&
                validPrice &&
                quantity <= stock,
            subtotal: price * quantity,
            discount: (mrp - price) * quantity
        };
    });

    return (
        <section className="cart-page">
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
                    <span aria-current="page">Cart</span>
                </nav>

                <div className="cart-page-header">
                    <div>
                        <h1>Shopping Cart</h1>
                        <p>
                            {cartCount}{" "}
                            {cartCount === 1 ? "item" : "items"} in your cart
                        </p>
                    </div>

                    {cartItems.length > 0 && (
                        <Link
                            to="/products"
                            className="cart-continue"
                        >
                            <i
                                className="fa-solid fa-arrow-left"
                                aria-hidden="true"
                            />
                            Continue Shopping
                        </Link>
                    )}
                </div>

                {error && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                    >
                        {error}{" "}
                        <button
                            type="button"
                            className="btn btn-link"
                            disabled={loading}
                            onClick={refreshCart}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!ready ? (
                    <p role="status">
                        {loading
                            ? "Loading your cart…"
                            : "Your cart could not be loaded."}
                    </p>
                ) : cartItems.length === 0 ? (
                    <div className="cart-panel cart-empty">
                        <div className="cart-empty-icon">
                            <i
                                className="fa-solid fa-bag-shopping"
                                aria-hidden="true"
                            />
                        </div>

                        <h2>Your cart is empty</h2>

                        <p>
                            Explore Zupito and add products you love
                            to your cart.
                        </p>

                        <Link
                            to="/products"
                            className="cart-primary cart-explore"
                        >
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <CartItems
                            items={cartItems}
                            cartCount={cartCount}
                            onQuantityChange={changeQuantity}
                            loading={loading && !updating}
                            formatPrice={formatPrice}
                        />

                        <CartSummary
                            cartCount={cartCount}
                            subtotal={subtotal}
                            discount={discount}
                            canCheckout={canCheckout && !error}
                            loading={loading}
                            onCheckout={handleCheckout}
                            formatPrice={formatPrice}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

export default Cart;