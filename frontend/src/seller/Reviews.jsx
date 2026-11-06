
import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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

import {
    getStoreName,
    ownProducts,
    readRows,
    sellerKey,
} from "../services/sellerService";

// ================== CONFIGURATION ==================
const REVIEW_KEY = "zupito_admin_reviews";
const DEMO_KEY = "zupito_seller_demo_reviews";
const MAX_REPLY_LENGTH = 700;

const moderationStatuses = [
    "All",
    "Published",
    "Flagged",
    "Hidden",
];

const replyStatuses = [
    "All",
    "Replied",
    "Not Replied",
];

// ================== REVIEW HELPERS ==================
function getReply(review) {
    return typeof review.sellerReply === "string"
        ? review.sellerReply
        : review.sellerReply?.text || "";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
}

function loadReviews(user) {
    const products = ownProducts(user);

    const productMap = new Map(
        products.map((product) => [
            String(product.id),
            product,
        ])
    );

    const realReviews = readRows(REVIEW_KEY).filter((review) =>
        productMap.has(String(review.productId))
    );

    const demoReviews = readRows(DEMO_KEY).filter((review) =>
        review.owner === sellerKey(user) &&
        productMap.has(String(review.productId))
    );

    return [...realReviews, ...demoReviews]
        .map((review) => ({
            ...review,
            isDemo: Boolean(review.isDemo),
            product: productMap.get(String(review.productId)),
        }))
        .sort((first, second) =>
            new Date(second.createdAt) -
            new Date(first.createdAt)
        );
}

function validateReply(text) {
    const reply = text.trim();

    if (
        reply.length < 10 ||
        reply.length > MAX_REPLY_LENGTH
    ) {
        throw new Error(
            "Write a reply between 10 and 700 characters."
        );
    }

    const privateDetails =
        /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d\s-]{8,}\d)/i;

    if (privateDetails.test(reply)) {
        throw new Error(
            "Remove links, email addresses and phone numbers from the public reply."
        );
    }

    return reply;
}

// ================== SAVE SELLER REPLY ==================
function saveSellerReply(user, selected, text) {
    const reply = validateReply(text);
    const key = selected.isDemo ? DEMO_KEY : REVIEW_KEY;

    const products = new Set(
        ownProducts(user).map((item) => String(item.id))
    );

    const reviews = readRows(key);

    const index = reviews.findIndex((item) =>
        String(item.id) === String(selected.id)
    );

    const current = reviews[index];

    if (
        !current ||
        !products.has(String(current.productId)) ||
        (
            selected.isDemo &&
            current.owner !== sellerKey(user)
        ) ||
        current.status !== "Published"
    ) {
        throw new Error(
            "This review is no longer available for a seller reply."
        );
    }

    const previousReply = getReply(current);

    if (reply === previousReply) {
        throw new Error("No changes to save.");
    }

    const now = new Date().toISOString();

    const previous = typeof current.sellerReply === "object"
        ? current.sellerReply
        : {};

    const history = Array.isArray(previous?.history)
        ? previous.history
        : [];

    reviews[index] = {
        ...current,
        sellerReply: {
            text: reply,
            sellerId: user?.id || null,
            sellerEmail: user?.email || null,
            storeName: getStoreName(user),
            createdAt: previous?.createdAt || now,
            updatedAt: previousReply ? now : null,
            history: previousReply
                ? [
                    ...history,
                    {
                        text: previousReply,
                        changedAt: now,
                    },
                ]
                : history,
        },
    };

    localStorage.setItem(
        key,
        JSON.stringify(reviews)
    );
}

// ================== DEMO FEEDBACK ==================
function createDemoReview(user, productId, rating) {
    const product = ownProducts(user).find((item) =>
        String(item.id) === String(productId)
    );

    if (
        !product ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        throw new Error(
            "Select your product and a valid sample rating."
        );
    }

    const now = new Date().toISOString();

    const review = {
        id: `ZRV-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        owner: sellerKey(user),
        productId: product.id,
        customerName: "Demo Customer",
        rating,
        title: "Sample Product Feedback",
        comment:
            "This is sample feedback for testing the Seller Reviews page. It was not submitted by a real customer.",
        status: "Published",
        createdAt: now,
        isDemo: true,
        verifiedPurchase: false,
        sellerReply: null,
    };

    localStorage.setItem(
        DEMO_KEY,
        JSON.stringify([
            ...readRows(DEMO_KEY),
            review,
        ])
    );
}

// ================== STATUS BADGE ==================
function ReviewStatus({ status }) {
    const tone = {
        Published: "success",
        Flagged: "warning",
        Hidden: "danger",
    }[status] || "neutral";

    return (
        <span className={`srv-status srv-status-${tone}`}>
            <i
                className="fa-solid fa-circle"
                aria-hidden="true"
            />

            {status}
        </span>
    );
}

// ================== SECTION HEADING ==================
function SectionHeading({
    icon,
    title,
    description,
    action,
}) {
    return (
        <div className="srv-section-heading">
            <span className="srv-heading-icon">
                <i
                    className={`fa-solid ${icon}`}
                    aria-hidden="true"
                />
            </span>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            {action}
        </div>
    );
}

// ================== SELLER REVIEWS ==================
function Reviews({ user }) {
    const [reviews, setReviews] = useState(() =>
        loadReviews(user)
    );

    const [search, setSearch] = useState("");
    const [productFilter, setProductFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [ratingFilter, setRatingFilter] = useState("All");
    const [replyFilter, setReplyFilter] = useState("All");
    const [sourceFilter, setSourceFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [selectedId, setSelectedId] = useState(null);
    const [replyText, setReplyText] = useState("");

    const [demoOpen, setDemoOpen] = useState(false);
    const [demoProduct, setDemoProduct] = useState("");
    const [demoRating, setDemoRating] = useState(4);

    const products = useMemo(
        () => ownProducts(user),
        [user?.id, user?.email, reviews]
    );

    const selected = reviews.find((item) =>
        item.id === selectedId
    );

    const published = reviews.filter((item) =>
        !item.isDemo && item.status === "Published"
    );

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setReviews(loadReviews(user));
    };

    useEffect(() => {
        const sync = () => {
            setReviews(loadReviews(user));
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email]);

    // ================== REVIEW STATISTICS ==================
    const average = published.length
        ? published.reduce(
            (total, item) => total + Number(item.rating || 0),
            0
        ) / published.length
        : 0;

    const needsReply = published.filter((item) =>
        !getReply(item)
    ).length;

    const lowRatings = published.filter((item) =>
        Number(item.rating) <= 2
    ).length;

    const statistics = [
        {
            label: "Published Reviews",
            value: String(published.length),
            note: "Customer reviews on your products",
            icon: "fa-comments",
            tone: "blue",
        },
        {
            label: "Average Rating",
            value: published.length
                ? `${average.toFixed(1)} / 5`
                : "—",
            note: "Published customer ratings only",
            icon: "fa-star",
            tone: "green",
        },
        {
            label: "Needs Reply",
            value: String(needsReply),
            note: "Published feedback without a reply",
            icon: "fa-reply",
            tone: "orange",
        },
        {
            label: "Low Ratings",
            value: String(lowRatings),
            note: "Published 1–2 star reviews",
            icon: "fa-triangle-exclamation",
            tone: "red",
        },
    ];

    // ================== SEARCH AND FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return reviews.filter((review) => {
            const matchesSearch = [
                review.id,
                review.product?.name,
                review.customerName,
                review.title,
                review.comment,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesReply = replyFilter === "All" ||
                (
                    replyFilter === "Replied"
                        ? Boolean(getReply(review))
                        : !getReply(review)
                );

            const matchesSource = sourceFilter === "All" ||
                (
                    sourceFilter === "Demo"
                        ? review.isDemo
                        : !review.isDemo
                );

            return matchesSearch &&
                (
                    productFilter === "All" ||
                    String(review.productId) === productFilter
                ) &&
                (
                    statusFilter === "All" ||
                    review.status === statusFilter
                ) &&
                (
                    ratingFilter === "All" ||
                    Number(review.rating) === Number(ratingFilter)
                ) &&
                matchesReply &&
                matchesSource;
        });
    }, [
        reviews,
        search,
        productFilter,
        statusFilter,
        ratingFilter,
        replyFilter,
        sourceFilter,
    ]);

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const resetFilters = () => {
        setSearch("");
        setProductFilter("All");
        setStatusFilter("All");
        setRatingFilter("All");
        setReplyFilter("All");
        setSourceFilter("All");
        setPage(0);
    };

    // ================== REVIEW ACTIONS ==================
    const openReview = (review) => {
        setSelectedId(review.id);
        setReplyText(getReply(review));
    };

    const saveReply = () => {
        if (!selected) return;

        try {
            saveSellerReply(
                user,
                selected,
                replyText
            );

            refresh();

            toast.success(
                "Seller reply saved successfully."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };

    const addDemoReview = () => {
        try {
            createDemoReview(
                user,
                demoProduct,
                demoRating
            );

            setDemoOpen(false);
            refresh();

            toast.success(
                "Demo feedback created for this seller only."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <main className="seller-reviews">
            {/* ================== PAGE HEADER ================== */}
            <header className="srv-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-star"
                            aria-hidden="true"
                        />
                        REVIEWS
                    </h1>

                    <p>
                        Monitor customer ratings and respond
                        to feedback on your products.
                    </p>
                </div>

                <div className="srv-hero-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={
                            <i className="fa-solid fa-arrows-rotate" />
                        }
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setDemoProduct(products[0]?.id || "");
                            setDemoRating(4);
                            setDemoOpen(true);
                        }}
                        startIcon={
                            <i className="fa-solid fa-flask" />
                        }
                    >
                        Demo Feedback
                    </Button>
                </div>
            </header>

            {/* ================== REVIEW SUMMARY ================== */}
            <section
                className="srv-stats"
                aria-label="Seller review summary"
            >
                {statistics.map((item) => (
                    <article
                        className={`srv-stat srv-stat-${item.tone}`}
                        key={item.label}
                    >
                        <div className="srv-stat-top">
                            <span>{item.label}</span>

                            <span className="srv-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <small>{item.note}</small>
                    </article>
                ))}
            </section>

            {/* ================== RATING DISTRIBUTION ================== */}
            <section className="srv-card srv-rating-card">
                <SectionHeading
                    icon="fa-chart-simple"
                    title="Rating Distribution"
                    description="Published customer reviews only; sample feedback is excluded."
                />

                <div className="srv-rating-summary">
                    <div className="srv-overall">
                        <strong>
                            {published.length
                                ? average.toFixed(1)
                                : "—"}
                        </strong>

                        <Rating
                            value={average}
                            precision={0.1}
                            readOnly
                        />

                        <small>
                            {published.length} published rating(s)
                        </small>
                    </div>

                    <div className="srv-bars">
                        {[5, 4, 3, 2, 1].map((stars) => {
                            const count = published.filter((item) =>
                                Number(item.rating) === stars
                            ).length;

                            return (
                                <div
                                    className="srv-bar-row"
                                    key={stars}
                                >
                                    <span>
                                        {stars}
                                        {" "}
                                        <i
                                            className="fa-solid fa-star"
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <progress
                                        value={count}
                                        max={Math.max(
                                            1,
                                            published.length
                                        )}
                                    />

                                    <small>{count}</small>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ================== REVIEW RECORDS ================== */}
            <section className="srv-card srv-list-card">
                <SectionHeading
                    icon="fa-comments"
                    title="Product Feedback"
                    description="Original customer reviews, moderation visibility and seller responses."
                    action={
                        <span className="srv-record-count">
                            {filtered.length} Records
                        </span>
                    }
                />

                {/* ================== FILTERS ================== */}
                <div className="srv-filters">
                    <TextField
                        size="small"
                        label="Search Review / Product / Customer"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Product"
                        value={productFilter}
                        onChange={(event) => {
                            setProductFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">
                            All Products
                        </MenuItem>

                        {products.map((product) => (
                            <MenuItem
                                value={String(product.id)}
                                key={product.id}
                            >
                                {product.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Rating"
                        value={ratingFilter}
                        onChange={(event) => {
                            setRatingFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">
                            All Ratings
                        </MenuItem>

                        {[5, 4, 3, 2, 1].map((rating) => (
                            <MenuItem
                                value={String(rating)}
                                key={rating}
                            >
                                {rating} Stars
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Moderation"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {moderationStatuses.map((status) => (
                            <MenuItem
                                value={status}
                                key={status}
                            >
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Reply Status"
                        value={replyFilter}
                        onChange={(event) => {
                            setReplyFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {replyStatuses.map((status) => (
                            <MenuItem
                                value={status}
                                key={status}
                            >
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        label="Source"
                        value={sourceFilter}
                        onChange={(event) => {
                            setSourceFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">
                            All Sources
                        </MenuItem>

                        <MenuItem value="Customer">
                            Customer
                        </MenuItem>

                        <MenuItem value="Demo">
                            Demo
                        </MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={resetFilters}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== REVIEWS TABLE ================== */}
                <TableContainer className="srv-table-scroll">
                    <Table
                        className="srv-table"
                        aria-label="Seller product reviews"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Rating</TableCell>
                                <TableCell>Review</TableCell>
                                <TableCell>Submitted</TableCell>
                                <TableCell>Moderation</TableCell>
                                <TableCell>Seller Reply</TableCell>
                                <TableCell align="right">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((review) => (
                                <TableRow
                                    key={`${
                                        review.isDemo ? "demo" : "real"
                                    }-${review.id}`}
                                    hover
                                >
                                    <TableCell>
                                        <div className="srv-product">
                                            {review.product?.image ? (
                                                <img
                                                    src={review.product.image}
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="srv-product-placeholder">
                                                    <i className="fa-solid fa-box-open" />
                                                </span>
                                            )}

                                            <div>
                                                <strong>
                                                    {review.product?.name ||
                                                        "Product"}
                                                </strong>

                                                <small>
                                                    {review.product?.productCode ||
                                                        "Seller Listing"}
                                                </small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="srv-cell">
                                            <strong>
                                                {review.customerName ||
                                                    "Customer"}
                                            </strong>

                                            {review.isDemo && (
                                                <small className="srv-demo-label">
                                                    Demo only
                                                </small>
                                            )}

                                            {!review.isDemo &&
                                                review.verifiedPurchase === true && (
                                                    <small className="srv-verified">
                                                        Verified Purchase
                                                    </small>
                                                )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="srv-cell">
                                            <Rating
                                                value={
                                                    Number(review.rating) || 0
                                                }
                                                size="small"
                                                readOnly
                                            />

                                            <small>
                                                {review.rating}/5
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="srv-feedback">
                                            <strong>
                                                {review.title ||
                                                    "Customer Feedback"}
                                            </strong>

                                            <p>
                                                {review.comment ||
                                                    "Rating only"}
                                            </p>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(review.createdAt)}
                                    </TableCell>

                                    <TableCell>
                                        <ReviewStatus
                                            status={review.status}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <span
                                            className={
                                                getReply(review)
                                                    ? "srv-replied"
                                                    : "srv-unreplied"
                                            }
                                        >
                                            {getReply(review)
                                                ? "Replied"
                                                : "Not Replied"}
                                        </span>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                openReview(review)
                                            }
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="srv-empty">
                                            <i
                                                className="fa-regular fa-comments"
                                                aria-hidden="true"
                                            />

                                            <h3>No reviews found</h3>

                                            <p>
                                                {reviews.length
                                                    ? "Try changing your search or filters."
                                                    : "Customer reviews for your products will appear here. Use Demo Feedback to test the seller reply flow."}
                                            </p>
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
                    page={Math.min(
                        page,
                        Math.max(
                            0,
                            Math.ceil(
                                filtered.length / rowsPerPage
                            ) - 1
                        )
                    )}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== REVIEW DETAILS ================== */}
            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                className="srv-dialog"
            >
                <DialogTitle>
                    Customer Review Details
                </DialogTitle>

                <DialogContent dividers>
                    {selected && (
                        <div className="srv-dialog-body">
                            <div className="srv-review-heading">
                                <div>
                                    <strong>
                                        {selected.product?.name}
                                    </strong>

                                    <small>
                                        {selected.customerName ||
                                            "Customer"}
                                        {" · "}
                                        {formatDate(selected.createdAt)}
                                    </small>
                                </div>

                                <ReviewStatus
                                    status={selected.status}
                                />
                            </div>

                            {selected.isDemo && (
                                <p className="srv-dialog-demo">
                                    Demo-only feedback. This record
                                    does not appear in public product
                                    ratings or Admin moderation.
                                </p>
                            )}

                            <Rating
                                value={Number(selected.rating) || 0}
                                readOnly
                            />

                            <h3>
                                {selected.title ||
                                    "Customer Feedback"}
                            </h3>

                            <p className="srv-original-comment">
                                {selected.comment ||
                                    "Rating only"}
                            </p>

                            {selected.status !== "Published" ? (
                                <p className="srv-dialog-note">
                                    This review is{" "}
                                    {String(selected.status || "pending").toLowerCase()}.
                                    Only Admin controls moderation;
                                    seller replies are disabled until
                                    it is published.
                                </p>
                            ) : (
                                <div className="srv-reply-section">
                                    <strong>
                                        {getReply(selected)
                                            ? "Edit Seller Reply"
                                            : "Write Seller Reply"}
                                    </strong>

                                    <p>
                                        Respond professionally without
                                        contact details, incentives
                                        or promotional links.
                                    </p>

                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={7}
                                        size="small"
                                        label="Your Reply"
                                        value={replyText}
                                        onChange={(event) =>
                                            setReplyText(event.target.value)
                                        }
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: MAX_REPLY_LENGTH,
                                            },
                                        }}
                                        helperText={
                                            `${replyText.length}/${MAX_REPLY_LENGTH} characters (minimum 10)`
                                        }
                                    />

                                    {selected.sellerReply?.updatedAt && (
                                        <small>
                                            Last edited:{" "}
                                            {formatDate(
                                                selected.sellerReply.updatedAt
                                            )}
                                        </small>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setSelectedId(null)}
                    >
                        Close
                    </Button>

                    {selected?.status === "Published" && (
                        <Button
                            variant="contained"
                            onClick={saveReply}
                            disabled={
                                replyText.trim().length < 10 ||
                                replyText.trim() === getReply(selected)
                            }
                        >
                            Save Reply
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ================== DEMO FEEDBACK ================== */}
            <Dialog
                open={demoOpen}
                onClose={() => setDemoOpen(false)}
                fullWidth
                maxWidth="sm"
                className="srv-dialog"
            >
                <DialogTitle>
                    Create Demo Feedback
                </DialogTitle>

                <DialogContent dividers>
                    <div className="srv-demo-form">
                        <p>
                            Creates seller-only sample feedback
                            to test replies. It is not a verified
                            purchase and never changes public ratings.
                        </p>

                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Your Product"
                            value={demoProduct}
                            onChange={(event) =>
                                setDemoProduct(event.target.value)
                            }
                        >
                            {products.map((product) => (
                                <MenuItem
                                    key={product.id}
                                    value={product.id}
                                >
                                    {product.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <div className="srv-demo-rating">
                            <span>Sample Rating</span>

                            <Rating
                                value={demoRating}
                                onChange={(_, value) =>
                                    setDemoRating(value || 0)
                                }
                            />
                        </div>

                        {!products.length && (
                            <p>
                                Add a seller product before creating
                                demo feedback.
                            </p>
                        )}
                    </div>
                </DialogContent>

                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setDemoOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disabled={
                            !demoProduct ||
                            demoRating < 1
                        }
                        onClick={addDemoReview}
                    >
                        Create Sample
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default Reviews;
