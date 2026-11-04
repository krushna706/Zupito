
import { Link } from "react-router-dom";
import { Box, Button, Paper } from "@mui/material";

import { useCart } from "../../context/CartContext";
import { getProductPath } from "../../utils/productVariants";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

const panelStyle = {
    backgroundColor: "var(--color-background)",
    border: "1px solid var(--color-border)",
    borderRadius: "14px",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
};

const primaryButtonStyle = {
    minHeight: 48,
    fontFamily: "inherit",
    fontSize: "0.875rem",
    fontWeight: 700,
    textTransform: "none",
    borderRadius: "10px",
    backgroundColor: "var(--color-primary)",
    "&:hover": {
        backgroundColor: "var(--color-primary-hover)",
    },
};

// ================== CART PAGE ==================
function Cart() {
    const { items, cartCount, changeQuantity } = useCart();

    const cartItems = items.map(({ product, quantity }) => {
        const price = Number(product.price);
        const mrp = Number(product.mrp);
        const stock = Number(product.stock);

        const validPrice = Number.isFinite(price) && price >= 0;
        const validStock = Number.isInteger(stock) && stock >= 0;

        const availableStock = validStock ? stock : 0;
        const sellingPrice = validPrice ? price : 0;

        const originalPrice = Number.isFinite(mrp) && mrp > sellingPrice
            ? mrp
            : sellingPrice;

        return {
            product,
            quantity,
            price: sellingPrice,
            mrp: originalPrice,
            stock: availableStock,
            validPrice,
            available: validPrice && quantity <= availableStock,
            subtotal: sellingPrice * quantity,
            savings: (originalPrice - sellingPrice) * quantity,
        };
    });

    const subtotal = cartItems.reduce(
        (total, item) => total + item.subtotal,
        0
    );

    const savings = cartItems.reduce(
        (total, item) => total + item.savings,
        0
    );

    const canCheckout = cartItems.length > 0
        && cartItems.every((item) => item.available);

    const removeItem = (product, quantity) => {
        changeQuantity(product, -quantity);
    };

    return (
        <section className="cart-page" style={{ paddingBlock: "20px 48px" }}>
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

                <Box sx={{ mb: 3 }}>
                    <h1
                        style={{
                            marginBottom: 6,
                            fontSize: "clamp(1.5rem, 2.3vw, 2rem)",
                        }}
                    >
                        Shopping Cart
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            color: "var(--color-muted)",
                        }}
                    >
                        {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
                    </p>
                </Box>

                {cartItems.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            ...panelStyle,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 360,
                            padding: 4,
                            textAlign: "center",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 80,
                                height: 80,
                                mb: 3,
                                borderRadius: "50%",
                                backgroundColor: "var(--color-accent-soft)",
                                color: "var(--color-primary)",
                                fontSize: "2rem",
                            }}
                        >
                            <i
                                className="fa-solid fa-bag-shopping"
                                aria-hidden="true"
                            />
                        </Box>

                        <h2
                            style={{
                                marginBottom: 8,
                                fontSize: "1.375rem",
                            }}
                        >
                            Your cart is empty
                        </h2>

                        <p
                            style={{
                                maxWidth: 360,
                                color: "var(--color-muted)",
                                fontSize: "0.875rem",
                            }}
                        >
                            Explore our collection and add your favourite
                            products to your shopping cart.
                        </p>

                        <Button
                            component={Link}
                            to="/products"
                            variant="contained"
                            disableElevation
                            sx={{
                                ...primaryButtonStyle,
                                mt: 1,
                                px: 4,
                            }}
                        >
                            Explore Products
                        </Button>
                    </Paper>
                ) : (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "minmax(0, 1fr)",
                                lg: "minmax(0, 1fr) 340px",
                            },
                            alignItems: "start",
                            gap: 3,
                        }}
                    >
                        {/* Cart Items */}
                        <Paper elevation={0} sx={panelStyle}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 2,
                                    px: { xs: 2, sm: 3 },
                                    py: 2,
                                    borderBottom: "1px solid var(--color-border)",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "1.125rem",
                                    }}
                                >
                                    Cart Items ({cartCount})
                                </h2>

                                <Link
                                    to="/products"
                                    style={{
                                        fontSize: "0.8125rem",
                                        fontWeight: 600,
                                        color: "var(--color-primary)",
                                    }}
                                >
                                    Continue Shopping
                                </Link>
                            </Box>

                            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
                                {cartItems.map((item, index) => {
                                    const {
                                        product,
                                        quantity,
                                        price,
                                        mrp,
                                        stock,
                                        validPrice,
                                        available,
                                    } = item;

                                    const details = [
                                        ...new Set([
                                            product.variantLabel,
                                            product.packLabel,
                                        ].filter(Boolean)),
                                    ].join(" · ");

                                    const productPath = product.productPath
                                        || getProductPath(
                                            product.productId || product._id,
                                            product.variantId
                                        );

                                    return (
                                        <Box
                                            component="li"
                                            key={product._id}
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: {
                                                    xs: "90px minmax(0, 1fr)",
                                                    sm: "120px minmax(0, 1fr)",
                                                },
                                                gap: { xs: 2, sm: 3 },
                                                p: { xs: 2, sm: 3 },
                                                borderBottom: index < cartItems.length - 1
                                                    ? "1px solid var(--color-border)"
                                                    : "none",
                                            }}
                                        >
                                            <Link
                                                to={productPath}
                                                aria-label={`View ${product.name}`}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        width: "100%",
                                                        aspectRatio: "1",
                                                        overflow: "hidden",
                                                        borderRadius: "10px",
                                                        border: "1px solid var(--color-border)",
                                                        backgroundColor: "var(--color-surface)",
                                                    }}
                                                >
                                                    {product.image ? (
                                                        <Box
                                                            component="img"
                                                            src={product.image}
                                                            alt={product.name}
                                                            loading="lazy"
                                                            sx={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "contain",
                                                                p: 1,
                                                            }}
                                                        />
                                                    ) : (
                                                        <i
                                                            className="fa-regular fa-image"
                                                            aria-hidden="true"
                                                            style={{
                                                                fontSize: "1.5rem",
                                                                color: "var(--color-muted)",
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Link>

                                            <Box sx={{ minWidth: 0 }}>
                                                {product.brand && (
                                                    <Box
                                                        sx={{
                                                            mb: 0.5,
                                                            fontSize: "0.75rem",
                                                            color: "var(--color-muted)",
                                                        }}
                                                    >
                                                        {product.brand}
                                                    </Box>
                                                )}

                                                <Link
                                                    to={productPath}
                                                    style={{
                                                        display: "block",
                                                        marginBottom: 6,
                                                        fontSize: "0.9375rem",
                                                        fontWeight: 700,
                                                        lineHeight: 1.5,
                                                        color: "var(--color-primary)",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {product.name}
                                                </Link>

                                                {details && (
                                                    <Box
                                                        sx={{
                                                            mb: 1,
                                                            fontSize: "0.8125rem",
                                                            color: "var(--color-muted)",
                                                        }}
                                                    >
                                                        {details}
                                                    </Box>
                                                )}

                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "baseline",
                                                        flexWrap: "wrap",
                                                        gap: 1,
                                                        mb: 1,
                                                    }}
                                                >
                                                    <strong
                                                        style={{
                                                            fontSize: "1.0625rem",
                                                            color: "var(--color-primary)",
                                                        }}
                                                    >
                                                        {validPrice
                                                            ? currencyFormatter.format(price)
                                                            : "Price unavailable"}
                                                    </strong>

                                                    {validPrice && mrp > price && (
                                                        <del
                                                            style={{
                                                                fontSize: "0.8125rem",
                                                                color: "var(--color-muted)",
                                                            }}
                                                        >
                                                            {currencyFormatter.format(mrp)}
                                                        </del>
                                                    )}
                                                </Box>

                                                <Box
                                                    sx={{
                                                        mb: 2,
                                                        fontSize: "0.75rem",
                                                        fontWeight: 600,
                                                        color: available
                                                            ? "var(--color-success)"
                                                            : "var(--color-danger)",
                                                    }}
                                                >
                                                    {!validPrice
                                                        ? "Price unavailable"
                                                        : stock === 0
                                                            ? "Out of stock"
                                                            : quantity > stock
                                                                ? `Only ${stock} available`
                                                                : "In Stock"}
                                                </Box>

                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        flexWrap: "wrap",
                                                        gap: 2,
                                                    }}
                                                >
                                                    <Box
                                                        role="group"
                                                        aria-label={`Quantity for ${product.name}`}
                                                        sx={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            border: "1px solid #efc7a7",
                                                            backgroundColor: "var(--color-accent-soft)",
                                                            borderRadius: "9px",
                                                            overflow: "hidden",
                                                        }}
                                                        className="product-quantity"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => changeQuantity(product, -1)}
                                                            aria-label={`Decrease ${product.name} quantity`}
                                                        >
                                                            <i
                                                                className="fa-solid fa-minus"
                                                                aria-hidden="true"
                                                            />
                                                        </button>

                                                        <span aria-live="polite">
                                                            {quantity}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => changeQuantity(product, 1)}
                                                            disabled={!validPrice || quantity >= stock}
                                                            aria-label={`Increase ${product.name} quantity`}
                                                        >
                                                            <i
                                                                className="fa-solid fa-plus"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </Box>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(product, quantity)}
                                                        aria-label={`Remove ${product.name} from cart`}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            padding: "8px 4px",
                                                            border: 0,
                                                            background: "transparent",
                                                            color: "var(--color-danger)",
                                                            fontSize: "0.8125rem",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <i
                                                            className="fa-regular fa-trash-can"
                                                            aria-hidden="true"
                                                        />
                                                        Remove
                                                    </button>
                                                </Box>

                                                {quantity > 1 && validPrice && (
                                                    <Box
                                                        sx={{
                                                            mt: 1.5,
                                                            fontSize: "0.8125rem",
                                                            color: "var(--color-muted)",
                                                        }}
                                                    >
                                                        Item total:{" "}
                                                        <strong>
                                                            {currencyFormatter.format(item.subtotal)}
                                                        </strong>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Paper>

                        {/* Order Summary */}
                        <Paper
                            component="aside"
                            elevation={0}
                            sx={{
                                ...panelStyle,
                                position: { lg: "sticky" },
                                top: { lg: 110 },
                            }}
                        >
                            <Box
                                sx={{
                                    px: 3,
                                    py: 2.5,
                                    borderBottom: "1px solid var(--color-border)",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "1.125rem",
                                    }}
                                >
                                    Order Summary
                                </h2>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        mb: 2,
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    <span>Subtotal ({cartCount} items)</span>
                                    <strong>
                                        {currencyFormatter.format(subtotal)}
                                    </strong>
                                </Box>

                                {savings > 0 && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 2,
                                            mb: 2,
                                            fontSize: "0.875rem",
                                            color: "var(--color-success)",
                                        }}
                                    >
                                        <span>Product Savings</span>
                                        <strong>
                                            -{currencyFormatter.format(savings)}
                                        </strong>
                                    </Box>
                                )}

                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        mb: 2.5,
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    <span>Delivery Charges</span>
                                    <span style={{ color: "var(--color-muted)" }}>
                                        At checkout
                                    </span>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 2,
                                        py: 2,
                                        mb: 2.5,
                                        borderTop: "1px solid var(--color-border)",
                                        borderBottom: "1px solid var(--color-border)",
                                    }}
                                >
                                    <strong style={{ fontSize: "1rem" }}>
                                        Subtotal
                                    </strong>

                                    <strong
                                        style={{
                                            fontSize: "1.25rem",
                                            color: "var(--color-primary)",
                                        }}
                                    >
                                        {currencyFormatter.format(subtotal)}
                                    </strong>
                                </Box>

                                {!canCheckout && (
                                    <p
                                        role="alert"
                                        style={{
                                            marginBottom: 16,
                                            fontSize: "0.8125rem",
                                            color: "var(--color-danger)",
                                        }}
                                    >
                                        Some items have unavailable prices or
                                        insufficient stock. Please update your cart.
                                    </p>
                                )}

                                <Button
                                    component={Link}
                                    to="/checkout"
                                    variant="contained"
                                    fullWidth
                                    disableElevation
                                    disabled={!canCheckout}
                                    endIcon={
                                        <i
                                            className="fa-solid fa-arrow-right"
                                            aria-hidden="true"
                                            style={{ fontSize: "0.8125rem" }}
                                        />
                                    }
                                    sx={primaryButtonStyle}
                                >
                                    Proceed to Checkout
                                </Button>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 1,
                                        mt: 2,
                                        fontSize: "0.75rem",
                                        color: "var(--color-muted)",
                                    }}
                                >
                                    <i
                                        className="fa-solid fa-shield-halved"
                                        aria-hidden="true"
                                    />
                                    Secure Checkout
                                </Box>

                                <Box
                                    sx={{
                                        mt: 2,
                                        p: 1.5,
                                        backgroundColor: "var(--color-surface)",
                                        borderRadius: "8px",
                                        fontSize: "0.75rem",
                                        lineHeight: 1.6,
                                        color: "var(--color-muted)",
                                    }}
                                >
                                    Final payable amount, including applicable
                                    delivery charges and taxes, will be shown
                                    at checkout.
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </div>
        </section>
    );
}

export default Cart;
