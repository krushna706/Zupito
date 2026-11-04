
import { Link } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import CartItems from "./CartItems";
import CartSummary from "./CartSummary";

const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
});

const formatPrice = (value) => formatter.format(value);

// ================== CART PAGE ==================
function Cart() {
    const { items, cartCount, changeQuantity } = useCart();

    const cartItems = items.map(({ product, quantity }) => {
        const rawPrice = Number(product.price);
        const rawMrp = Number(product.mrp);
        const rawStock = Number(product.stock);

        const validPrice = Number.isFinite(rawPrice) && rawPrice >= 0;
        const price = validPrice ? rawPrice : 0;
        const mrp = Number.isFinite(rawMrp) && rawMrp > price ? rawMrp : price;
        const stock = Number.isInteger(rawStock) && rawStock >= 0 ? rawStock : 0;

        return {
            product,
            quantity,
            price,
            mrp,
            stock,
            validPrice,
            available: validPrice && quantity <= stock,
            subtotal: price * quantity,
            discount: (mrp - price) * quantity,
        };
    });

    const subtotal = cartItems.reduce((total, item) => total + item.subtotal, 0);
    const discount = cartItems.reduce((total, item) => total + item.discount, 0);
    const canCheckout = cartItems.length > 0 && cartItems.every((item) => item.available);

    return (
        <section className="cart-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Cart</span>
                </nav>

                <div className="cart-page-header">
                    <div>
                        <h1>Shopping Cart</h1>
                        <p>{cartCount} {cartCount === 1 ? "item" : "items"} in your cart</p>
                    </div>

                    {cartItems.length > 0 && (
                        <Link to="/products" className="cart-continue">
                            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                            Continue Shopping
                        </Link>
                    )}
                </div>

                {cartItems.length === 0 ? (
                    <div className="cart-panel cart-empty">
                        <div className="cart-empty-icon">
                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                        </div>
                        <h2>Your cart is empty</h2>
                        <p>Explore Zupito and add products you love to your cart.</p>
                        <Link to="/products" className="cart-primary cart-explore">
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <CartItems
                            items={cartItems}
                            cartCount={cartCount}
                            onQuantityChange={changeQuantity}
                            formatPrice={formatPrice}
                        />

                        <CartSummary
                            cartCount={cartCount}
                            subtotal={subtotal}
                            discount={discount}
                            canCheckout={canCheckout}
                            formatPrice={formatPrice}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

export default Cart;
