
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
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
import { sortNewestFirst } from "../utils/sortNewestFirst";

import { productCatalog } from "../data/productCatalog";

// ================== PRODUCT CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_products";
const CATEGORY_KEY = "zupito_admin_categories";

const sellerGroups = {
    electronics: "TechNova Electronics",
    fashion: "Urban Fashion",
    grocery: "Fresh Basket",
    "personal-care": "GlowCare Store",
    "home-kitchen": "HomeCraft Living",
    travel: "TravelMate Store",
};

const groupNames = {
    electronics: "Electronics",
    fashion: "Fashion",
    grocery: "Groceries",
    "personal-care": "Health & Beauty",
    "home-kitchen": "Home & Living",
    travel: "Travel Essentials",
};

const categoryNames = {
    mobiles: "Mobiles",
    laptops: "Laptops",
    headphones: "Headphones",
    "mens-wear": "Men's Wear",
    "womens-wear": "Women's Wear",
    "kids-wear": "Kids' Wear",
    footwear: "Footwear",
    watches: "Watches",
    "personal-care": "Personal Care",
    "daily-essentials": "Daily Essentials",
    "snacks-drinks": "Snacks & Drinks",
    beauty: "Beauty",
    "home-kitchen": "Home & Kitchen",
    backpacks: "Backpacks",
    "trolley-bags": "Trolley Bags",
    "travel-accessories": "Travel Accessories",
};

const pendingProducts = new Set([
    "preview-smartphone",
    "preview-dress",
    "preview-pantry",
    "preview-backpack",
]);

const reviewTypes = {
    "preview-dress": "Content Update",
    "preview-backpack": "Content Update",
};

const initialProducts = productCatalog.map((product, index) => {
    const status = pendingProducts.has(product._id)
        ? "Pending"
        : product._id === "preview-watch"
            ? "Rejected"
            : product._id === "preview-headphones"
                ? "Suspended"
                : "Approved";

    return {
        id: product._id,
        productCode: `ZP${1001 + index}`,
        name: product.name,
        brand: product.brand,
        seller: sellerGroups[product.group] || "Marketplace Seller",
        category: product.category,
        group: product.group,
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        variants: product.variants || [],
        highlights: product.highlights || [],
        description: product.description || [],
        specifications: product.specifications || [],
        reviewType: reviewTypes[product._id] || "New Listing",
        status,
        submittedAt: new Date(Date.UTC(2026, 9, 18 + index)).toISOString(),
        reviewedAt: status === "Pending" ? null : "2026-11-03T10:00:00.000Z",
        moderationReason: status === "Rejected"
            ? "Product description needs additional information."
            : status === "Suspended"
                ? "Listing temporarily restricted for review."
                : "",
        history: [],
    };
});

// ================== HELPERS ==================
function readStorage(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : null;
    } catch {
        return null;
    }
}

function loadProducts() {
    return readStorage(STORAGE_KEY) || initialProducts;
}

function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          });
}

function getStock(product) {
    return product.variants?.length
        ? product.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
        : Number(product.stock || 0);
}

function StatusBadge({ value }) {
    const theme = {
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

// ================== MANAGE PRODUCTS ==================
function Products() {
    const [products, setProducts] = useState(loadProducts);
    const [categories, setCategories] = useState(() => readStorage(CATEGORY_KEY) || []);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [groupFilter, setGroupFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== SELECTION AND ACTIONS ==================
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedProduct = products.find((product) => product.id === selectedId);
    const actionTargets = products.filter((product) => action?.ids.includes(product.id));

    // ================== LOCAL STORAGE ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        } catch {
            // Continue with the current React state.
        }
    }, [products]);

    // ================== CATEGORY VALIDATION ==================
    const getCategoryIssue = (product) => {
        if (!categories.length) return null;

        const category = categories.find((item) => item.slug === product.category);

        if (!category) {
            return "Product category is no longer registered.";
        }

        if (category.status !== "Active") {
            return "Product category is disabled.";
        }

        if (category.parentId) {
            const parent = categories.find((item) => item.slug === category.parentId);

            if (!parent || parent.status !== "Active") {
                return "Parent category is disabled or unavailable.";
            }
        }

        return null;
    };

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Products",
            value: products.length,
            description: "Submitted product listings",
            icon: "fa-boxes-stacked",
            theme: "blue",
        },
        {
            label: "Pending Reviews",
            value: products.filter((item) => item.status === "Pending").length,
            description: "Awaiting admin decision",
            icon: "fa-clock",
            theme: "orange",
        },
        {
            label: "Approved Products",
            value: products.filter((item) => item.status === "Approved").length,
            description: "Approved listing records",
            icon: "fa-circle-check",
            theme: "green",
        },
        {
            label: "Restricted Products",
            value: products.filter((item) => ["Rejected", "Suspended"].includes(item.status)).length,
            description: "Rejected or suspended listings",
            icon: "fa-ban",
            theme: "red",
        },
    ];

    // ================== SEARCH RESULTS ==================
    const filteredProducts = products.filter((product) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            product.name,
            product.productCode,
            product.brand,
            product.seller,
            product.category,
            categoryNames[product.category],
        ].some((value) => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (statusFilter === "All" || product.status === statusFilter) &&
            (groupFilter === "All" || product.group === groupFilter);
    });

    const sortedProducts = sortNewestFirst(filteredProducts, "submittedAt");

    const visibleProducts = sortedProducts.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const visiblePending = visibleProducts.filter((item) => item.status === "Pending");
    const allVisibleSelected = visiblePending.length > 0 &&
        visiblePending.every((item) => selectedIds.includes(item.id));
    const someVisibleSelected = visiblePending.some((item) => selectedIds.includes(item.id));

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        groupFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setGroupFilter("All");
        setSelectedIds([]);
        setPage(0);
    };

    const handleRefresh = () => {
        setProducts(loadProducts());
        setCategories(readStorage(CATEGORY_KEY) || []);
        setSelectedIds([]);
        setPage(0);
        toast.info("Product records refreshed.");
    };

    // ================== BULK SELECTION ==================
    const toggleProduct = (productId) => {
        setSelectedIds((previous) =>
            previous.includes(productId)
                ? previous.filter((id) => id !== productId)
                : [...previous, productId]
        );
    };

    const toggleVisible = () => {
        const ids = visiblePending.map((item) => item.id);

        setSelectedIds((previous) =>
            allVisibleSelected
                ? previous.filter((id) => !ids.includes(id))
                : [...new Set([...previous, ...ids])]
        );
    };

    // ================== MODERATION ACTIONS ==================
    const openAction = (type, ids) => {
        setSelectedId(null);
        setAction({ type, ids });
        setReason("");
        setActionError("");
    };

    const closeAction = () => {
        setAction(null);
        setReason("");
        setActionError("");
    };

    const blockedApprovals = action?.type === "approve" || action?.type === "restore"
        ? actionTargets.filter((product) => getCategoryIssue(product))
        : [];

    const handleConfirm = () => {
        if (!action || !actionTargets.length) {
            closeAction();
            return;
        }

        const allowedStatus = ["approve", "reject"].includes(action.type)
            ? "Pending"
            : action.type === "suspend" ? "Approved" : "Suspended";

        if (actionTargets.some((product) => product.status !== allowedStatus)) {
            setActionError("One or more listing statuses have changed. Refresh and try again.");
            return;
        }

        if (blockedApprovals.length) {
            setActionError("Enable the affected categories before approving these listings.");
            return;
        }

        if (["reject", "suspend"].includes(action.type) && reason.trim().length < 5) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        const nextStatus = {
            approve: "Approved",
            reject: "Rejected",
            suspend: "Suspended",
            restore: "Approved",
        }[action.type];

        const now = new Date().toISOString();
        const targetIds = new Set(action.ids);

        setProducts((previous) => previous.map((product) => {
            if (!targetIds.has(product.id)) return product;

            return {
                ...product,
                status: nextStatus,
                moderationReason: ["reject", "suspend"].includes(action.type)
                    ? reason.trim()
                    : "",
                reviewedAt: now,
                updatedAt: now,
                history: [
                    ...(product.history || []),
                    {
                        status: nextStatus,
                        reason: reason.trim(),
                        date: now,
                    },
                ],
            };
        }));

        setSelectedIds((previous) =>
            previous.filter((id) => !targetIds.has(id))
        );
        setPage(0);

        const messages = {
            approve: "approved",
            reject: "rejected",
            suspend: "suspended",
            restore: "restored",
        };

        toast.success(`${actionTargets.length} product listing(s) ${messages[action.type]}.`);
        closeAction();
    };

    return (
        <div className="manage-products">
            {/* ================== PAGE HEADER ================== */}
            <section className="mp-hero">
                <div className="mp-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-box-open" aria-hidden="true" />
                        PRODUCT MANAGEMENT
                    </span>

                    <p>
                        Review seller listings, product content, approval requests
                        and marketplace restrictions.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="mp-refresh-button"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="mp-stats" aria-label="Product overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`mp-stat mp-stat--${item.theme}`}>
                        <div className="mp-stat-heading">
                            <span>{item.label}</span>

                            <span className="mp-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="mp-stat-value">{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== PRODUCT LIST ================== */}
            <section className="mp-card">
                <div className="mp-section-header">
                    <div className="mp-section-heading">
                        <span className="mp-section-icon">
                            <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Product Listings</h2>
                            <p>Review new submissions and major content changes from sellers.</p>
                        </div>
                    </div>

                    <span className="mp-record-count">
                        {filteredProducts.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="mp-toolbar">
                    <div className="mp-search">
                        <TextField
                            label="Search Products"
                            placeholder="Product, brand, seller, category or product ID"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setSelectedIds([]);
                                setPage(0);
                            }}
                            size="small"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <i className="fa-solid fa-magnifying-glass" />
                                        </InputAdornment>
                                    ),
                                },
                                htmlInput: { maxLength: 100 },
                            }}
                            fullWidth
                        />
                    </div>

                    <TextField
                        select
                        label="Review Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setSelectedIds([]);
                            setPage(0);
                        }}
                        className="mp-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Approved">Approved</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                        <MenuItem value="Suspended">Suspended</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Category"
                        value={groupFilter}
                        onChange={(event) => {
                            setGroupFilter(event.target.value);
                            setSelectedIds([]);
                            setPage(0);
                        }}
                        className="mp-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Categories</MenuItem>

                        {Object.entries(groupNames).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="mp-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== BULK ACTIONS ================== */}
                {selectedIds.length > 0 && (
                    <div className="mp-bulk-actions">
                        <span>
                            <i className="fa-solid fa-check-double" aria-hidden="true" />
                            {selectedIds.length} pending listing(s) selected
                        </span>

                        <div>
                            <Button
                                variant="outlined"
                                onClick={() => setSelectedIds([])}
                            >
                                Clear
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => openAction("reject", selectedIds)}
                            >
                                Reject Selected
                            </Button>

                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => openAction("approve", selectedIds)}
                            >
                                Approve Selected
                            </Button>
                        </div>
                    </div>
                )}

                {/* ================== PRODUCTS TABLE ================== */}
                <TableContainer className="mp-table-container">
                    <Table className="mp-table" aria-label="Product listings">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allVisibleSelected}
                                        indeterminate={someVisibleSelected && !allVisibleSelected}
                                        disabled={!visiblePending.length}
                                        onChange={toggleVisible}
                                        inputProps={{ "aria-label": "Select visible pending products" }}
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
                            {visibleProducts.map((product) => (
                                <TableRow key={product.id} hover>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={selectedIds.includes(product.id)}
                                            disabled={product.status !== "Pending"}
                                            onChange={() => toggleProduct(product.id)}
                                            inputProps={{ "aria-label": `Select ${product.name}` }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <div className="mp-product">
                                            <span className="mp-product-image">
                                                <img src={product.image} alt="" loading="lazy" />
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
                                            <strong>{product.seller}</strong>
                                            <small>Marketplace Seller</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mp-cell-stack">
                                            <strong>{categoryNames[product.category] || product.category}</strong>
                                            <small>{groupNames[product.group] || product.group}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mp-cell-stack">
                                            <strong>{formatPrice(product.price)}</strong>
                                            <small>{getStock(product)} units in stock</small>
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
                                            onClick={() => setSelectedId(product.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="mp-empty">
                                            <span><i className="fa-solid fa-box-open" /></span>
                                            <h3>No Products Found</h3>
                                            <p>Try a different search or filter selection.</p>

                                            {hasFilters && (
                                                <Button variant="outlined" onClick={resetFilters}>
                                                    Clear Filters
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
                    className="mp-pagination"
                    count={filteredProducts.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setSelectedIds([]);
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== PRODUCT DETAILS ================== */}
            <Dialog
                open={Boolean(selectedProduct)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="md"
                slotProps={{ paper: { className: "mp-dialog-paper" } }}
            >
                {selectedProduct && (
                    <>
                        <DialogTitle className="mp-dialog-title">
                            Product Review Details
                        </DialogTitle>

                        <DialogContent dividers className="mp-dialog-content">
                            <div className="mp-detail-product">
                                <span className="mp-detail-image">
                                    <img src={selectedProduct.image} alt={selectedProduct.name} />
                                </span>

                                <div>
                                    <h3>{selectedProduct.name}</h3>
                                    <p>{selectedProduct.brand} · {selectedProduct.productCode}</p>
                                    <span>{selectedProduct.seller}</span>
                                </div>

                                <StatusBadge value={selectedProduct.status} />
                            </div>

                            <div className="mp-detail-section">
                                <h4>Listing Information</h4>

                                <dl className="mp-detail-grid">
                                    <DetailItem label="Submitted By" value={selectedProduct.seller} />
                                    <DetailItem label="Request Type" value={selectedProduct.reviewType} />
                                    <DetailItem label="Category" value={categoryNames[selectedProduct.category] || selectedProduct.category} />
                                    <DetailItem label="Submitted On" value={formatDate(selectedProduct.submittedAt)} />
                                    <DetailItem label="Selling Price" value={formatPrice(selectedProduct.price)} />
                                    <DetailItem label="Total Stock" value={`${getStock(selectedProduct)} units`} />
                                    <DetailItem label="Variants" value={selectedProduct.variants.length || "Single option"} />
                                    <DetailItem label="Reviewed On" value={formatDate(selectedProduct.reviewedAt)} />
                                </dl>
                            </div>

                            {getCategoryIssue(selectedProduct) && (
                                <Alert severity="warning" className="mp-dialog-alert">
                                    {getCategoryIssue(selectedProduct)} Approval is unavailable until the category is enabled.
                                </Alert>
                            )}

                            {selectedProduct.moderationReason && (
                                <Alert severity="warning" className="mp-dialog-alert">
                                    <strong>Admin Remarks:</strong> {selectedProduct.moderationReason}
                                </Alert>
                            )}

                            {selectedProduct.highlights.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Product Highlights</h4>

                                    <ul className="mp-highlights">
                                        {selectedProduct.highlights.map((highlight, index) => (
                                            <li key={index}>{highlight}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedProduct.description.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Product Description</h4>

                                    <div className="mp-description">
                                        {selectedProduct.description.map((section, index) => (
                                            <div key={index}>
                                                <strong>{section.title}</strong>
                                                <p>{section.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.specifications.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Specifications</h4>

                                    <dl className="mp-detail-grid">
                                        {selectedProduct.specifications.map((specification, index) => (
                                            <DetailItem
                                                key={index}
                                                label={specification.label}
                                                value={specification.value}
                                            />
                                        ))}
                                    </dl>
                                </div>
                            )}

                            {selectedProduct.variants.length > 0 && (
                                <div className="mp-detail-section">
                                    <h4>Product Variants</h4>

                                    <div className="mp-variants">
                                        {selectedProduct.variants.map((variant) => (
                                            <div key={variant.id} className="mp-variant-row">
                                                <div>
                                                    <strong>
                                                        {Object.values(variant.options || {}).join(" · ") || variant.id}
                                                    </strong>
                                                    <small>{variant.id}</small>
                                                </div>

                                                <div>
                                                    <strong>{formatPrice(variant.price)}</strong>
                                                    <small>{variant.stock} in stock</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </DialogContent>

                        <DialogActions className="mp-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedProduct.status === "Pending" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => openAction("reject", [selectedProduct.id])}
                                    >
                                        Reject
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => openAction("approve", [selectedProduct.id])}
                                    >
                                        Approve
                                    </Button>
                                </>
                            )}

                            {selectedProduct.status === "Approved" && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => openAction("suspend", [selectedProduct.id])}
                                >
                                    Suspend Listing
                                </Button>
                            )}

                            {selectedProduct.status === "Suspended" && (
                                <Button
                                    variant="contained"
                                    onClick={() => openAction("restore", [selectedProduct.id])}
                                >
                                    Restore Listing
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== MODERATION CONFIRMATION ================== */}
            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "mp-dialog-paper" } }}
            >
                <DialogTitle className="mp-dialog-title">
                    {({
                        approve: "Approve Product Listings",
                        reject: "Reject Product Listings",
                        suspend: "Suspend Product Listing",
                        restore: "Restore Product Listing",
                    })[action?.type]}
                </DialogTitle>

                <DialogContent className="mp-dialog-content">
                    <p className="mp-confirm-text">
                        Confirm this action for {actionTargets.length} product listing(s)?
                    </p>

                    {blockedApprovals.length > 0 && (
                        <Alert severity="warning" className="mp-dialog-alert">
                            {blockedApprovals.length} listing(s) cannot be approved because
                            their category or parent category is unavailable.
                        </Alert>
                    )}

                    {["reject", "suspend"].includes(action?.type) && (
                        <TextField
                            label={action?.type === "reject" ? "Rejection Reason" : "Suspension Reason"}
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
                        />
                    )}

                    {action?.type === "suspend" && (
                        <Alert severity="info" className="mp-dialog-alert">
                            Suspension restricts the listing. It does not cancel existing customer orders.
                        </Alert>
                    )}

                    {actionError && (
                        <Alert severity="error" className="mp-dialog-alert">
                            {actionError}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions className="mp-dialog-actions">
                    <Button color="inherit" onClick={closeAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={["reject", "suspend"].includes(action?.type) ? "error" : "primary"}
                        disabled={blockedApprovals.length > 0}
                        onClick={handleConfirm}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Products;
