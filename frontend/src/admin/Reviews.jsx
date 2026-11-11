import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    MenuItem,
    Rating,
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

import api from "../services/api";
import { sortNewestFirst } from "../utils/sortNewestFirst";

const statusOptions = ["Published", "Flagged", "Hidden"];

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

function ReviewBadge({ status }) {
    const theme =
        {
            Published: "success",
            Flagged: "warning",
            Hidden: "danger",
        }[status] || "neutral";

    return (
        <span className={`mr-badge mr-badge--${theme}`}>
            <span className="mr-badge-dot" />
            {status}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="mr-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== REVIEW MANAGEMENT ==================
function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [ratingFilter, setRatingFilter] = useState("All");
    const [productFilter, setProductFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedReview = reviews.find((review) => review.id === selectedId);
    const actionReview = reviews.find((review) => review.id === action?.id);

    const getProduct = (productId) =>
        products.find((product) => String(product.id || product._id) === String(productId));

    const getProductName = (productId) => getProduct(productId)?.name || "Product Unavailable";

    const loadReviews = async () => {
        const { data } = await api.get("/reviews/manage");
        setReviews(data.reviews);
        setProducts([...new Map(data.products.map((p) => [p._id, p])).values()]);
    };
    useEffect(() => {
        loadReviews().catch((error) => toast.error(error.message));
    }, []);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Reviews",
            value: reviews.length,
            description: "Product feedback records",
            theme: "blue",
            icon: "fa-star",
        },
        {
            label: "Published Reviews",
            value: reviews.filter((review) => review.status === "Published").length,
            description: "Visible moderation status",
            theme: "green",
            icon: "fa-circle-check",
        },
        {
            label: "Flagged Reviews",
            value: reviews.filter((review) => review.status === "Flagged").length,
            description: "Awaiting moderation",
            theme: "orange",
            icon: "fa-flag",
        },
        {
            label: "Hidden Reviews",
            value: reviews.filter((review) => review.status === "Hidden").length,
            description: "Removed from public display",
            theme: "red",
            icon: "fa-eye-slash",
        },
    ];

    // ================== PRODUCT FILTER OPTIONS ==================
    const reviewedProducts = [...new Set(reviews.map((review) => review.productId))]
        .map((id) => ({ id, name: getProductName(id) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // ================== FILTERED REVIEWS ==================
    const filteredReviews = sortNewestFirst(
        reviews.filter((review) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                review.id,
                review.customerName,
                review.title,
                review.comment,
                review.productId,
                getProductName(review.productId),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" || review.status === statusFilter) &&
                (ratingFilter === "All" || review.rating === Number(ratingFilter)) &&
                (productFilter === "All" || review.productId === productFilter)
            );
        }),
        "createdAt"
    );

    const visibleReviews = filteredReviews.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const hasFilters =
        Boolean(search.trim()) ||
        statusFilter !== "All" ||
        ratingFilter !== "All" ||
        productFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setRatingFilter("All");
        setProductFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        loadReviews().catch((error) => toast.error(error.message));

        setPage(0);
        toast.info("Review records refreshed.");
    };

    // ================== MODERATION ACTIONS ==================
    const openAction = (review, type) => {
        setSelectedId(null);

        setAction({
            id: review.id,
            type,
            previousStatus: review.status,
        });

        setReason("");
        setActionError("");
    };

    const closeAction = () => {
        setAction(null);
        setReason("");
        setActionError("");
    };

    const handleModeration = async () => {
        if (!actionReview) return;
        try {
            await api.patch(`/reviews/${actionReview.id}`, {
                status: {
                    flag: "Flagged",
                    hide: "Hidden",
                    publish: "Published",
                    restore: "Published",
                }[action.type],
                reason: reason.trim(),
            });
            await loadReviews();
            closeAction();
        } catch (error) {
            setActionError(error.message);
        }
    };

    // ================== PAGE CONTENT ==================
    return (
        <div className="manage-reviews">
            {/* ================== PAGE HEADER ================== */}
            <section className="mr-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-star" aria-hidden="true" />
                        REVIEW MANAGEMENT
                    </span>

                    <p>
                        Monitor customer feedback and moderate product reviews while preserving
                        original ratings and comments.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="mr-refresh"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="mr-stats" aria-label="Review overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`mr-stat mr-stat--${item.theme}`}>
                        <div className="mr-stat-heading">
                            <span>{item.label}</span>

                            <span className="mr-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== REVIEW RECORDS ================== */}
            <section className="mr-card">
                <div className="mr-section-header">
                    <div className="mr-section-heading">
                        <span className="mr-section-icon">
                            <i className="fa-solid fa-comments" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Product Reviews</h2>
                            <p>Review original feedback, visibility and moderation history.</p>
                        </div>
                    </div>

                    <span className="mr-record-count">{filteredReviews.length} Records</span>
                </div>

                {/* ================== FILTERS ================== */}
                <div className="mr-toolbar">
                    <TextField
                        className="mr-search"
                        label="Search Reviews"
                        placeholder="Review, product, customer or comment"
                        size="small"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
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

                    <TextField
                        select
                        label="Moderation Status"
                        className="mr-filter"
                        size="small"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>

                        {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Star Rating"
                        className="mr-filter mr-filter--rating"
                        size="small"
                        value={ratingFilter}
                        onChange={(event) => {
                            setRatingFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Ratings</MenuItem>

                        {[5, 4, 3, 2, 1].map((rating) => (
                            <MenuItem key={rating} value={String(rating)}>
                                {rating} Stars
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Product"
                        className="mr-filter mr-filter--product"
                        size="small"
                        value={productFilter}
                        onChange={(event) => {
                            setProductFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Products</MenuItem>

                        {reviewedProducts.map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                                {product.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="mr-reset"
                        disabled={!hasFilters}
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== TABLE ================== */}
                <TableContainer className="mr-table-scroll">
                    <Table className="mr-table" aria-label="Product review records">
                        <TableHead>
                            <TableRow>
                                <TableCell>Review / Customer</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Rating</TableCell>
                                <TableCell>Feedback</TableCell>
                                <TableCell>Submitted On</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleReviews.map((review) => {
                                const product = getProduct(review.productId);

                                return (
                                    <TableRow key={review.id} hover>
                                        <TableCell>
                                            <div className="mr-cell">
                                                <strong className="mr-code">{review.id}</strong>
                                                <small>{review.customerName}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mr-product">
                                                <span className="mr-product-image">
                                                    {product?.image ? (
                                                        <img
                                                            src={product.image}
                                                            alt=""
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <i className="fa-solid fa-box-open" />
                                                    )}
                                                </span>

                                                <strong>{getProductName(review.productId)}</strong>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mr-rating">
                                                <Rating
                                                    value={review.rating}
                                                    size="small"
                                                    readOnly
                                                />
                                                <small>{review.rating}/5</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="mr-feedback">
                                                <strong>{review.title}</strong>
                                                <p>{review.comment}</p>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mr-date">
                                                {formatDate(review.createdAt)}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <ReviewBadge status={review.status} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                className="mr-view"
                                                onClick={() => setSelectedId(review.id)}
                                            >
                                                View Details
                                                <i className="fa-solid fa-arrow-up-right-from-square" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {visibleReviews.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="mr-empty">
                                            <i className="fa-solid fa-comments" />
                                            <h3>No Reviews Found</h3>
                                            <p>Try adjusting your search or filters.</p>

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
                    className="mr-pagination"
                    component="div"
                    count={filteredReviews.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== REVIEW DETAILS ================== */}
            <Dialog
                open={Boolean(selectedReview)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "mr-dialog" } }}
            >
                {selectedReview && (
                    <>
                        <DialogTitle>Review Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="mr-detail-banner">
                                <div>
                                    <span>REVIEW REFERENCE</span>
                                    <h3>{selectedReview.id}</h3>
                                    <p>{formatDate(selectedReview.createdAt)}</p>
                                </div>

                                <ReviewBadge status={selectedReview.status} />
                            </div>

                            <div className="mr-detail-section">
                                <h4>Customer & Product</h4>

                                <dl className="mr-detail-grid">
                                    <DetailItem
                                        label="Customer"
                                        value={selectedReview.customerName}
                                    />
                                    <DetailItem
                                        label="Product"
                                        value={getProductName(selectedReview.productId)}
                                    />
                                    <DetailItem
                                        label="Product ID"
                                        value={selectedReview.productId}
                                    />
                                    <DetailItem
                                        label="Purchase Verification"
                                        value="Not Connected"
                                    />
                                </dl>
                            </div>

                            <div className="mr-detail-section">
                                <h4>Customer Feedback</h4>

                                <div className="mr-detail-feedback">
                                    <Rating value={selectedReview.rating} readOnly size="medium" />

                                    <strong>{selectedReview.title}</strong>
                                    <p>{selectedReview.comment}</p>
                                </div>
                            </div>

                            {selectedReview.moderationReason && (
                                <Alert
                                    severity={
                                        selectedReview.status === "Hidden" ? "warning" : "info"
                                    }
                                    className="mr-alert"
                                >
                                    <strong>Latest Moderation Note:</strong>{" "}
                                    {selectedReview.moderationReason}
                                </Alert>
                            )}

                            {(selectedReview.moderationHistory || []).length > 0 && (
                                <div className="mr-detail-section">
                                    <h4>Moderation History</h4>

                                    <div className="mr-history">
                                        {[...selectedReview.moderationHistory]
                                            .reverse()
                                            .map((entry, index) => (
                                                <div key={index}>
                                                    <strong>
                                                        {entry.from} → {entry.to}
                                                    </strong>
                                                    <small>{formatDate(entry.date)}</small>
                                                    <p>{entry.reason}</p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <Alert severity="info" className="mr-alert">
                                Moderation controls review visibility only. Customer rating and
                                original feedback cannot be edited by Admin.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="mr-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedReview.status === "Published" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => openAction(selectedReview, "flag")}
                                    >
                                        Flag
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={() => openAction(selectedReview, "hide")}
                                    >
                                        Hide Review
                                    </Button>
                                </>
                            )}

                            {selectedReview.status === "Flagged" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => openAction(selectedReview, "hide")}
                                    >
                                        Hide Review
                                    </Button>

                                    <Button
                                        variant="contained"
                                        onClick={() => openAction(selectedReview, "publish")}
                                    >
                                        Publish
                                    </Button>
                                </>
                            )}

                            {selectedReview.status === "Hidden" && (
                                <Button
                                    variant="contained"
                                    onClick={() => openAction(selectedReview, "restore")}
                                >
                                    Restore Review
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
                slotProps={{ paper: { className: "mr-dialog" } }}
            >
                <DialogTitle>
                    {{
                        flag: "Flag Review",
                        hide: "Hide Review",
                        publish: "Publish Review",
                        restore: "Restore Review",
                    }[action?.type] || "Moderate Review"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="mr-confirm-text">
                        Review: <strong>{actionReview?.id}</strong>
                    </p>

                    {action?.type === "hide" && (
                        <Alert severity="warning" className="mr-alert">
                            Hiding this review changes its moderation visibility. The original
                            review will remain saved.
                        </Alert>
                    )}

                    <TextField
                        label="Moderation Reason"
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setActionError("");
                        }}
                        error={Boolean(actionError)}
                        helperText={actionError || "Enter 5–300 characters."}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        multiline
                        minRows={3}
                        fullWidth
                        required
                    />
                </DialogContent>

                <DialogActions className="mr-dialog-actions">
                    <Button color="inherit" onClick={closeAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={action?.type === "hide" ? "error" : "primary"}
                        onClick={handleModeration}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Reviews;
