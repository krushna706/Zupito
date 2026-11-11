import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Alert,
    Button,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";

import { fetchSellerProducts } from "../services/sellerService";

const money = (paise) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format((paise || 0) / 100);

function Products() {
    const [data, setData] = useState({
        products: [],
        total: 0,
        statistics: { total: 0, pending: 0, approved: 0, restricted: 0 },
    });
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setError("");

        const timer = setTimeout(async () => {
            try {
                const result = await fetchSellerProducts(
                    { search, status, page: page + 1, limit },
                    controller.signal
                );

                if (!active) return;
                setData(result);

                const lastPage = Math.max(0, Math.ceil(result.total / limit) - 1);
                if (page > lastPage) setPage(lastPage);
            } catch (failure) {
                if (active) setError(failure.message);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, status, page, limit, revision]);

    const stats = [
        ["Total Listings", "total", "blue", "fa-boxes-stacked"],
        ["Under Review", "pending", "orange", "fa-clock"],
        ["Approved", "approved", "green", "fa-circle-check"],
        ["Restricted", "restricted", "red", "fa-ban"],
    ];

    return (
        <main className="seller-product-page">
            <section className="sp-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-box-open" /> MANAGE PRODUCTS
                    </h1>
                    <p>Create listings, manage product details and track approval decisions.</p>
                </div>
                <div className="sp-hero-actions">
                    <Button
                        variant="outlined"
                        disabled={loading}
                        onClick={() => setRevision((value) => value + 1)}
                    >
                        Refresh
                    </Button>
                    <Button variant="contained" component={Link} to="/manage/products/new">
                        Add Product
                    </Button>
                </div>
            </section>

            {error && <Alert severity="error">{error}</Alert>}

            <section className="sp-stats">
                {stats.map(([label, key, color, icon]) => (
                    <div key={key} className={`sp-stat sp-stat-${color}`}>
                        <div>
                            <span>{label}</span>
                            <i className={`fa-solid ${icon}`} />
                        </div>
                        <strong>{loading || error ? "—" : data.statistics[key]}</strong>
                        <small>Your store listings</small>
                    </div>
                ))}
            </section>

            <section className="sp-card sp-list-card">
                <div className="sp-card-head">
                    <span className="sp-section-icon">
                        <i className="fa-solid fa-list-check" />
                    </span>
                    <div>
                        <h2>Product Listings</h2>
                        <p>Only your seller account's products are displayed.</p>
                    </div>
                    <span className="sp-count">{data.total} Records</span>
                </div>

                <div className="sp-toolbar">
                    <TextField
                        size="small"
                        label="Search Products"
                        value={search}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Approval Status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", "Pending", "Approved", "Rejected", "Suspended"].map((item) => (
                            <MenuItem key={item} value={item}>
                                {item}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        onClick={() => {
                            setSearch("");
                            setStatus("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer className="sp-table-scroll">
                    <Table className="sp-table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Product Details</TableCell>
                                <TableCell>Variants</TableCell>
                                <TableCell>Price / Stock</TableCell>
                                <TableCell>Review Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!loading &&
                                !error &&
                                data.products.map((product) => (
                                    <TableRow key={product._id}>
                                        <TableCell>
                                            <div className="sp-product-cell">
                                                <img src={product.image} alt="" />
                                                <div>
                                                    <strong>{product.name}</strong>
                                                    <p>{product.brand}</p>
                                                    <small>{product.productCode}</small>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.variantCount}</TableCell>
                                        <TableCell>
                                            <strong>From {money(product.pricePaise)}</strong>
                                            <p>Available: {product.stock - product.reserved}</p>
                                            <small>
                                                On hand: {product.stock} · Reserved:{" "}
                                                {product.reserved}
                                            </small>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`sp-badge sp-badge-${product.status.toLowerCase()}`}
                                            >
                                                {product.status}
                                            </span>
                                            {product.moderationReason && (
                                                <p>{product.moderationReason}</p>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                component={Link}
                                                to={`/manage/products/${product._id}/edit`}
                                                variant="outlined"
                                            >
                                                Edit Product
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {(loading || error || !data.products.length) && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        {loading
                                            ? "Loading products..."
                                            : error
                                              ? "Unable to load products."
                                              : "No products found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={data.total}
                    page={Math.min(page, Math.max(0, Math.ceil(data.total / limit) - 1))}
                    rowsPerPage={limit}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(event) => {
                        setLimit(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>
        </main>
    );
}

export default Products;
