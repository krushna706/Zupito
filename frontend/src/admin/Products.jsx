import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { toast } from "react-toastify";

import {
    getAdminProducts,
    getAdminProduct,
    updateProductStatus,
    bulkProductStatus,
} from "../services/adminService";

const initialData = {
    products: [],
    total: 0,
    categories: [],
    statistics: {},
};

const statuses = ["All", "Pending", "Approved", "Rejected", "Suspended"];

const availableActions = {
    Pending: ["Reject", "Approve"],
    Approved: ["Suspend"],
    Suspended: ["Reactivate"],
    Rejected: [],
};

const statisticsConfig = [
    {
        key: "total",
        label: "Total Products",
        description: "Submitted product listings",
        icon: "fa-boxes-stacked",
        theme: "blue",
    },
    {
        key: "pending",
        label: "Pending Reviews",
        description: "Awaiting admin decision",
        icon: "fa-clock",
        theme: "orange",
    },
    {
        key: "approved",
        label: "Approved Products",
        description: "Approved listing records",
        icon: "fa-circle-check",
        theme: "green",
    },
    {
        key: "restricted",
        label: "Restricted Products",
        description: "Rejected or suspended listings",
        icon: "fa-ban",
        theme: "red",
    },
];

function formatPrice(paise) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format((paise || 0) / 100);
}

function formatDate(value) {
    return value ? new Date(value).toLocaleString("en-IN") : "—";
}

function errorMessage(error) {
    return error.response?.data?.message || "Unable to complete the request. Please try again.";
}

function StatusBadge({ value }) {
    const theme =
        {
            Pending: "warning",
            Approved: "success",
            Rejected: "danger",
            Suspended: "neutral",
        }[value] || "neutral";

    return (
        <span className={`mp-badge mp-badge--${theme}`}>
            <span className="mp-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="mp-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

function Products() {
    const [data, setData] = useState(initialData);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [categoryId, setCategoryId] = useState("");
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [reload, setReload] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const [detailId, setDetailId] = useState(null);
    const [detail, setDetail] = useState(null);

    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");
    const [saving, setSaving] = useState(false);
    const [bulkResults, setBulkResults] = useState([]);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");
        setSelectedIds([]);

        const timer = setTimeout(async () => {
            try {
                const result = await getAdminProducts({
                    search,
                    status,
                    categoryId,
                    page: page + 1,
                    limit,
                });

                if (!active) return;

                if (page > 0 && page * limit >= result.total) {
                    setPage(Math.max(0, Math.ceil(result.total / limit) - 1));
                    return;
                }

                setData(result);
            } catch (requestError) {
                if (!active) return;

                setError(errorMessage(requestError));
                setData(initialData);
            } finally {
                if (active) setLoading(false);
            }
        }, 250);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [search, status, categoryId, page, limit, reload]);

    useEffect(() => {
        if (!detailId) return;

        let active = true;

        getAdminProduct(detailId)
            .then((product) => {
                if (active) setDetail(product);
            })
            .catch((requestError) => {
                if (!active) return;

                toast.error(errorMessage(requestError));
                setDetailId(null);
            });

        return () => {
            active = false;
        };
    }, [detailId]);

    const pendingProducts = data.products.filter((product) => product.status === "Pending");

    const selectedProducts = pendingProducts.filter((product) => selectedIds.includes(product.id));

    const allSelected =
        pendingProducts.length > 0 &&
        pendingProducts.every((product) => selectedIds.includes(product.id));

    const hasFilters = Boolean(search.trim()) || status !== "All" || Boolean(categoryId);

    const reasonRequired = ["Reject", "Suspend"].includes(action?.type);

    function refresh() {
        setSelectedIds([]);
        setReload((value) => value + 1);
    }

    function changeFilter(setter, value) {
        setter(value);
        setPage(0);
        setSelectedIds([]);
        setBulkResults([]);
    }

    function resetFilters() {
        setSearch("");
        setStatus("All");
        setCategoryId("");
        setPage(0);
        setSelectedIds([]);
        setBulkResults([]);
    }

    function toggleProduct(productId) {
        setSelectedIds((previous) =>
            previous.includes(productId)
                ? previous.filter((id) => id !== productId)
                : [...previous, productId]
        );
    }

    function openDetails(productId) {
        setDetail(null);
        setDetailId(productId);
    }

    function openAction(type, products) {
        if (!products.length) return;

        setAction({
            type,
            items: products.map((product) => ({
                productId: product.id,
                version: product.version,
                name: product.name,
            })),
        });

        setReason("");
        setActionError("");
        setDetailId(null);
    }

    function closeAction() {
        if (!saving) setAction(null);
    }

    async function confirmAction() {
        if (!action || saving) return;

        if (reasonRequired && reason.trim().length < 5) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        setSaving(true);
        setActionError("");
        setBulkResults([]);

        try {
            if (action.items.length === 1) {
                const item = action.items[0];

                const result = await updateProductStatus(item.productId, {
                    action: action.type,
                    reason: reason.trim(),
                    version: item.version,
                });

                toast.success(result.message);
            } else {
                const result = await bulkProductStatus({
                    action: action.type,
                    reason: reason.trim(),
                    items: action.items.map(({ productId, version }) => ({
                        productId,
                        version,
                    })),
                });

                const results = result.results.map((item) => ({
                    ...item,
                    name:
                        action.items.find((target) => target.productId === item.productId)?.name ||
                        item.productId,
                }));

                setBulkResults(results);

                const completed = results.filter((item) => item.success).length;
                const message = `${completed} of ${results.length} decisions completed.`;

                if (completed === results.length) {
                    toast.success(message);
                } else {
                    toast.warning(message);
                }
            }

            setAction(null);
            refresh();
        } catch (requestError) {
            setActionError(errorMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="manage-products">
            <section className="mp-hero">
                <div className="mp-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-box-open" aria-hidden="true" />
                        PRODUCT MANAGEMENT
                    </span>
                    <p>Review seller listings, product content and marketplace restrictions.</p>
                </div>

                <Button
                    variant="outlined"
                    className="mp-refresh-button"
                    onClick={refresh}
                    disabled={loading || saving}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            <section className="mp-stats" aria-label="Product overview">
                {statisticsConfig.map((item) => (
                    <article key={item.key} className={`mp-stat mp-stat--${item.theme}`}>
                        <div className="mp-stat-heading">
                            <span>{item.label}</span>
                            <span className="mp-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>
                        <strong className="mp-stat-value">{data.statistics[item.key] || 0}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {error && <Alert severity="error">{error}</Alert>}

            {bulkResults.length > 0 && (
                <section className="mp-card">
                    <div className="mp-section-header">
                        <div className="mp-section-heading">
                            <h2>Bulk Review Results</h2>
                        </div>
                        <Button onClick={() => setBulkResults([])}>Dismiss</Button>
                    </div>

                    {bulkResults.map((result) => (
                        <Alert
                            key={result.productId}
                            severity={result.success ? "success" : "warning"}
                            className="mp-dialog-alert"
                        >
                            <strong>{result.name}:</strong> {result.message}
                        </Alert>
                    ))}
                </section>
            )}

            <section className="mp-card">
                <div className="mp-section-header">
                    <div className="mp-section-heading">
                        <span className="mp-section-icon">
                            <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                        </span>
                        <div>
                            <h2>Product Listings</h2>
                            <p>Review new submissions and major content changes.</p>
                        </div>
                    </div>
                    <span className="mp-record-count">{data.total} Records</span>
                </div>

                <div className="mp-toolbar">
                    <div className="mp-search">
                        <TextField
                            label="Search Products"
                            placeholder="Product, code, brand, seller or category"
                            value={search}
                            onChange={(event) => changeFilter(setSearch, event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            size="small"
                            fullWidth
                            disabled={saving}
                        />
                    </div>

                    <TextField
                        select
                        label="Review Status"
                        value={status}
                        onChange={(event) => changeFilter(setStatus, event.target.value)}
                        className="mp-filter"
                        size="small"
                        disabled={saving}
                    >
                        {statuses.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Statuses" : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Category"
                        value={categoryId}
                        onChange={(event) => changeFilter(setCategoryId, event.target.value)}
                        className="mp-filter"
                        size="small"
                        disabled={saving}
                    >
                        <MenuItem value="">All Categories</MenuItem>
                        {data.categories.map((category) => (
                            <MenuItem key={category._id} value={category._id}>
                                {category.name}
                                {category.status !== "Active" ? " (Disabled)" : ""}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="mp-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters || saving}
                    >
                        Reset
                    </Button>
                </div>

                {selectedProducts.length > 0 && (
                    <div className="mp-bulk-actions">
                        <span>{selectedProducts.length} pending listing(s) selected</span>
                        <div>
                            <Button onClick={() => setSelectedIds([])} disabled={saving}>
                                Clear
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                disabled={loading || saving}
                                onClick={() => openAction("Reject", selectedProducts)}
                            >
                                Reject Selected
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                disabled={loading || saving}
                                onClick={() => openAction("Approve", selectedProducts)}
                            >
                                Approve Selected
                            </Button>
                        </div>
                    </div>
                )}

                <TableContainer className="mp-table-container">
                    <Table className="mp-table" aria-label="Product listings">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={selectedProducts.length > 0 && !allSelected}
                                        disabled={loading || saving || !pendingProducts.length}
                                        onChange={() =>
                                            setSelectedIds(
                                                allSelected
                                                    ? []
                                                    : pendingProducts.map((product) => product.id)
                                            )
                                        }
                                        inputProps={{
                                            "aria-label": "Select visible pending products",
                                        }}
                                    />
                                </TableCell>
                                <TableCell>Product Details</TableCell>
                                <TableCell>Seller</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Price / Stock</TableCell>
                                <TableCell>Submission</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {!loading &&
                                data.products.map((product) => (
                                    <TableRow key={product.id} hover>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={selectedIds.includes(product.id)}
                                                disabled={saving || product.status !== "Pending"}
                                                onChange={() => toggleProduct(product.id)}
                                                inputProps={{
                                                    "aria-label": `Select ${product.name}`,
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <div className="mp-product">
                                                <span className="mp-product-image">
                                                    {product.image && (
                                                        <img
                                                            src={product.image}
                                                            alt=""
                                                            loading="lazy"
                                                        />
                                                    )}
                                                </span>
                                                <div>
                                                    <strong>{product.name}</strong>
                                                    <span>{product.brand}</span>
                                                    <small>{product.productCode}</small>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mp-cell-stack">
                                                <strong>{product.sellerName}</strong>
                                                <small>Seller: {product.sellerStatus}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mp-cell-stack">
                                                <strong>{product.categoryName}</strong>
                                                <small>{product.parentCategoryName}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mp-cell-stack">
                                                <strong>{formatPrice(product.pricePaise)}</strong>
                                                <small>
                                                    {product.stock} on hand ·{" "}
                                                    {product.reservedQuantity} reserved
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mp-cell-stack">
                                                <strong>{product.reviewType}</strong>
                                                <small>{formatDate(product.submittedAt)}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge value={product.status} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                className="mp-view-button"
                                                disabled={saving}
                                                onClick={() => openDetails(product.id)}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {(loading || data.products.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="mp-empty">
                                            <h3>
                                                {loading
                                                    ? "Loading Products..."
                                                    : "No Products Found"}
                                            </h3>
                                            {!loading && <p>Try a different search or filter.</p>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    className="mp-pagination"
                    count={data.total}
                    page={page}
                    rowsPerPage={limit}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => {
                        setSelectedIds([]);
                        setPage(value);
                    }}
                    onRowsPerPageChange={(event) =>
                        changeFilter(setLimit, Number(event.target.value))
                    }
                    disabled={loading || saving}
                />
            </section>

            <Dialog
                open={Boolean(detailId)}
                onClose={() => setDetailId(null)}
                fullWidth
                maxWidth="md"
                slotProps={{ paper: { className: "mp-dialog-paper" } }}
            >
                <DialogTitle className="mp-dialog-title">Product Review Details</DialogTitle>

                <DialogContent dividers className="mp-dialog-content">
                    {!detail && <p>Loading product details...</p>}

                    {detail && (
                        <>
                            <div className="mp-detail-product">
                                <span className="mp-detail-image">
                                    {detail.image && <img src={detail.image} alt={detail.name} />}
                                </span>
                                <div>
                                    <h3>{detail.name}</h3>
                                    <p>
                                        {detail.brand} · {detail.productCode}
                                    </p>
                                    <span>{detail.sellerName}</span>
                                </div>
                                <StatusBadge value={detail.status} />
                            </div>

                            <div className="mp-detail-section">
                                <h4>Listing Information</h4>
                                <dl className="mp-detail-grid">
                                    <DetailItem label="Product ID" value={detail.id} />
                                    <DetailItem label="Product Code" value={detail.productCode} />
                                    <DetailItem
                                        label="Seller Profile ID"
                                        value={detail.sellerProfileId}
                                    />
                                    <DetailItem
                                        label="Seller User Account ID"
                                        value={detail.sellerUserId}
                                    />
                                    <DetailItem label="Store Name" value={detail.sellerName} />
                                    <DetailItem label="Seller Status" value={detail.sellerStatus} />
                                    <DetailItem
                                        label="Seller Account Status"
                                        value={detail.sellerAccountStatus}
                                    />
                                    <DetailItem label="Category" value={detail.categoryName} />
                                    <DetailItem
                                        label="Parent Category"
                                        value={detail.parentCategoryName}
                                    />
                                    <DetailItem label="Request Type" value={detail.reviewType} />
                                    <DetailItem
                                        label="Submitted On"
                                        value={formatDate(detail.submittedAt)}
                                    />
                                    <DetailItem
                                        label="Reviewed On"
                                        value={formatDate(detail.reviewedAt)}
                                    />
                                    <DetailItem
                                        label="Reviewed By — Admin User Account ID"
                                        value={detail.reviewedById}
                                    />
                                </dl>
                            </div>

                            {detail.approvalIssue && (
                                <Alert severity="warning" className="mp-dialog-alert">
                                    {detail.approvalIssue}
                                </Alert>
                            )}

                            {detail.moderationReason && (
                                <Alert severity="warning" className="mp-dialog-alert">
                                    <strong>Admin Remarks:</strong> {detail.moderationReason}
                                </Alert>
                            )}

                            <div className="mp-detail-section">
                                <h4>Product Images</h4>
                                <div className="mp-variants">
                                    {detail.images.map((image, index) => (
                                        <span className="mp-detail-image" key={image.url}>
                                            <img
                                                src={image.url}
                                                alt={`${detail.name} — image ${index + 1}`}
                                                loading="lazy"
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mp-detail-section">
                                <h4>Product Description</h4>
                                <div className="mp-description">
                                    <p>{detail.description}</p>
                                </div>
                            </div>

                            {detail.highlights.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Product Highlights</h4>
                                    <ul className="mp-highlights">
                                        {detail.highlights.map((highlight, index) => (
                                            <li key={index}>{highlight}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {detail.specifications.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Specifications</h4>
                                    <dl className="mp-detail-grid">
                                        {detail.specifications.map((item, index) => (
                                            <DetailItem
                                                key={index}
                                                label={item.label}
                                                value={item.value}
                                            />
                                        ))}
                                    </dl>
                                </div>
                            )}

                            <div className="mp-detail-section">
                                <h4>Product Variants</h4>
                                <div className="mp-variants">
                                    {detail.variants.map((variant) => (
                                        <div key={variant.variantId} className="mp-variant-row">
                                            <div>
                                                <strong>{variant.label}</strong>
                                                <small>SKU: {variant.sku}</small>
                                                <small>Variant ID: {variant.variantId}</small>
                                                <small>
                                                    Product Image: {variant.imageIndex + 1}
                                                </small>
                                            </div>
                                            <div>
                                                <strong>{formatPrice(variant.pricePaise)}</strong>
                                                <small>MRP: {formatPrice(variant.mrpPaise)}</small>
                                                <small>
                                                    {variant.stock} on hand ·{" "}
                                                    {variant.reservedQuantity} reserved
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {detail.moderationHistory.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Recent Admin Decisions</h4>
                                    <div className="mp-variants">
                                        {detail.moderationHistory.map((item, index) => (
                                            <div key={index} className="mp-variant-row">
                                                <div>
                                                    <strong>
                                                        {item.fromStatus} → {item.toStatus}
                                                    </strong>
                                                    {item.reason && <small>{item.reason}</small>}
                                                    <small>
                                                        Admin User Account ID: {item.changedById}
                                                    </small>
                                                </div>
                                                <div>
                                                    <strong>{item.action}</strong>
                                                    <small>{formatDate(item.changedAt)}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogActions className="mp-dialog-actions">
                    <Button color="inherit" onClick={() => setDetailId(null)}>
                        Close
                    </Button>

                    {detail &&
                        (availableActions[detail.status] || []).map((type) => (
                            <Button
                                key={type}
                                variant="contained"
                                color={["Reject", "Suspend"].includes(type) ? "error" : "success"}
                                disabled={
                                    ["Approve", "Reactivate"].includes(type) &&
                                    Boolean(detail.approvalIssue)
                                }
                                onClick={() => openAction(type, [detail])}
                            >
                                {type}
                            </Button>
                        ))}
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "mp-dialog-paper" } }}
            >
                <DialogTitle className="mp-dialog-title">
                    {action?.type} Product Listings
                </DialogTitle>

                <DialogContent className="mp-dialog-content">
                    <p className="mp-confirm-text">
                        Confirm this action for {action?.items.length || 0} product listing(s)?
                    </p>

                    {action?.items.length > 1 && (
                        <Alert severity="info" className="mp-dialog-alert">
                            Each listing is checked separately. Results will show any listings that
                            could not be updated.
                        </Alert>
                    )}

                    {reasonRequired && (
                        <TextField
                            label={
                                action?.type === "Reject" ? "Rejection Reason" : "Suspension Reason"
                            }
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setActionError("");
                            }}
                            slotProps={{ htmlInput: { maxLength: 300 } }}
                            multiline
                            minRows={3}
                            fullWidth
                            required
                            disabled={saving}
                        />
                    )}

                    {actionError && (
                        <Alert severity="error" className="mp-dialog-alert">
                            {actionError}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions className="mp-dialog-actions">
                    <Button color="inherit" onClick={closeAction} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color={reasonRequired ? "error" : "primary"}
                        onClick={confirmAction}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Products;
