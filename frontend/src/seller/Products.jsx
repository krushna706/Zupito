
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Button, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
} from "@mui/material";

import {
    ownProducts, formatMoney, productStock, getCategories,
} from "../services/sellerService";

const statusList = ["All", "Pending", "Approved", "Rejected", "Suspended"];

function Badge({ status }) {
    return (
        <span className={`sp-badge sp-badge-${String(status || "Pending").toLowerCase()}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {status || "Pending"}
        </span>
    );
}

function Products({ user }) {
    const [products, setProducts] = useState(() => ownProducts(user));
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const refresh = () => {
        setProducts(ownProducts(user));
        setPage(0);
    };

    useEffect(() => {
        const sync = () => setProducts(ownProducts(user));

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user]);

    const categories = getCategories();

    const categoryName = (slug) =>
        categories.find((item) => item.slug === slug)?.name || slug;

    const stats = [
        [
            "Total Listings", products.length,
            "Your submitted products", "fa-boxes-stacked", "blue",
        ],
        [
            "Under Review",
            products.filter((p) => p.status === "Pending").length,
            "Awaiting moderation", "fa-clock", "orange",
        ],
        [
            "Approved",
            products.filter((p) => p.status === "Approved").length,
            "Ready for selling", "fa-circle-check", "green",
        ],
        [
            "Restricted",
            products.filter((p) =>
                ["Rejected", "Suspended"].includes(p.status)
            ).length,
            "Require attention", "fa-ban", "red",
        ],
    ];

    const filtered = useMemo(() => products.filter((product) => {
        const query = search.trim().toLowerCase();

        return (
            (statusFilter === "All" || product.status === statusFilter) &&
            [
                product.name,
                product.brand,
                product.productCode,
                product.category,
                product.variants?.map((v) => v.sku).join(" "),
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            )
        );
    }).sort((a, b) =>
        new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
    ), [products, search, statusFilter]);

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    return (
        <main className="seller-product-page">
            {/* Page Header */}
            <section className="sp-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-box-open" aria-hidden="true" />
                        MANAGE PRODUCTS
                    </h1>
                    <p>
                        Create listings, manage product details and track
                        approval decisions.
                    </p>
                </div>

                <div className="sp-hero-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        component={Link}
                        to="/manage/products/new"
                        startIcon={<i className="fa-solid fa-plus" />}
                    >
                        Add Product
                    </Button>
                </div>
            </section>

            {/* Statistics */}
            <section className="sp-stats" aria-label="Seller product statistics">
                {stats.map(([label, value, note, icon, color]) => (
                    <div key={label} className={`sp-stat sp-stat-${color}`}>
                        <div>
                            <span>{label}</span>
                            <i className={`fa-solid ${icon}`} aria-hidden="true" />
                        </div>
                        <strong>{value}</strong>
                        <small>{note}</small>
                    </div>
                ))}
            </section>

            {/* Product Listings */}
            <section className="sp-card sp-list-card">
                <div className="sp-card-head">
                    <span className="sp-section-icon">
                        <i className="fa-solid fa-list-check" />
                    </span>

                    <div>
                        <h2>Product Listings</h2>
                        <p>Only your seller account's products are displayed.</p>
                    </div>

                    <span className="sp-count">{filtered.length} Records</span>
                </div>

                <div className="sp-toolbar">
                    <TextField
                        size="small"
                        label="Search Products"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Approval Status"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                    >
                        {statusList.map((value) => (
                            <MenuItem value={value} key={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer className="sp-table-scroll">
                    <Table className="sp-table" aria-label="My product listings">
                        <TableHead>
                            <TableRow>
                                <TableCell>Product Details</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Price / Stock</TableCell>
                                <TableCell>Review Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((product) => (
                                <TableRow key={product.id} hover>
                                    <TableCell>
                                        <div className="sp-product-cell">
                                            {product.image ? (
                                                <img src={product.image} alt="" />
                                            ) : (
                                                <span className="sp-no-image">
                                                    <i className="fa-solid fa-image" />
                                                </span>
                                            )}

                                            <div>
                                                <strong>{product.name}</strong>
                                                <small>
                                                    {product.brand} · {product.productCode}
                                                </small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {categoryName(product.category)}
                                    </TableCell>

                                    <TableCell>
                                        <div className="sp-cell-stack">
                                            <strong>{formatMoney(product.price)}</strong>
                                            <small>
                                                {productStock(product)} in stock
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="sp-cell-stack">
                                            <Badge status={product.status} />
                                            <small>
                                                {product.reviewType || "New Listing"}
                                            </small>

                                            {product.moderationReason && (
                                                <small
                                                    className="sp-reason"
                                                    title={product.moderationReason}
                                                >
                                                    {product.moderationReason}
                                                </small>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            component={Link}
                                            to={`/manage/products/${product.id}/edit`}
                                            size="small"
                                            variant="outlined"
                                            startIcon={<i className="fa-solid fa-pen" />}
                                        >
                                            View / Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <div className="sp-empty">
                                            <i className="fa-solid fa-box-open" />
                                            <h3>No products found</h3>

                                            <p>
                                                {products.length
                                                    ? "Try a different search or status filter."
                                                    : "Create your first listing to preview the complete seller workflow."}
                                            </p>

                                            {!products.length && (
                                                <Button
                                                    component={Link}
                                                    to="/manage/products/new"
                                                    variant="outlined"
                                                >
                                                    Add First Product
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, next) => setPage(next)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>
        </main>
    );
}

export default Products;
