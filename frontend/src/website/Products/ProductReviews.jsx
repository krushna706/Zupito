import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ReviewForm from "../../components/ReviewForm";
import { toast } from "react-toastify";
import formatDate from "../../utils/formatDate";
import { useEffect, useMemo, useState } from "react";
import { Button, MenuItem, Pagination, Rating, TextField } from "@mui/material";
const PAGE_SIZE = 3;
function ProductReviewsContent({ product }) {
    const [ratingFilter, setRatingFilter] = useState(0);
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);
    const { user } = useAuth();
    const [purchase, setPurchase] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [eligibility, setEligibility] = useState("Available after a delivered purchase");
    const productId = product?.productId || product?._id;
    useEffect(() => {
        let active = true;
        if (user?.role !== "customer" || !productId) return;
        api.get(`/reviews/products/${productId}/eligibility`)
            .then(({ data }) => {
                if (!active) return;
                setPurchase(data.purchase);
                setEligibility(
                    data.reviewed && !data.purchase
                        ? "You have already reviewed your purchase"
                        : "Available after a delivered purchase"
                );
            })
            .catch((error) => {
                if (active) toast.error(error.message);
            });
        return () => {
            active = false;
        };
    }, [user, productId]);
    const submitReview = async (payload) => {
        const { data } = await api.post("/reviews", payload);
        setPurchase(null);
        setEligibility("Your review has been submitted");
        try {
            const response = await api.get(`/reviews/products/${productId}`);
            setFeedback(response.data.reviews);
        } catch {
            toast.info("Review saved. Refresh the page to see the latest feedback.");
        }
        return data;
    };
    const reviews = useMemo(() => {
        if (Array.isArray(feedback || product?.reviews)) {
            return (feedback || product.reviews).filter(
                (review) =>
                    Number.isInteger(Number(review.rating)) &&
                    Number(review.rating) >= 1 &&
                    Number(review.rating) <= 5
            );
        }
        return [];
    }, [product, feedback]);
    const filteredReviews = useMemo(() => {
        const result = reviews.filter(
            (review) => ratingFilter === 0 || Number(review.rating) === ratingFilter
        );
        return [...result].sort((a, b) => {
            if (sort === "highest") return Number(b.rating) - Number(a.rating);
            if (sort === "lowest") return Number(a.rating) - Number(b.rating);
            return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0);
        });
    }, [reviews, ratingFilter, sort]);
    const catalogRating = Number(
        feedback
            ? reviews.reduce((sum, row) => sum + Number(row.rating), 0) / (reviews.length || 1)
            : product?.rating
    );
    const catalogCount = Number(product?.ratingCount);
    const totalRatings = feedback
        ? feedback.length
        : Number.isInteger(catalogCount) && catalogCount > 0
          ? catalogCount
          : reviews.length;
    const averageRating =
        Number.isFinite(catalogRating) &&
        catalogRating >= 0 &&
        catalogRating <= 5 &&
        catalogCount > 0
            ? catalogRating
            : reviews.length
              ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
              : 0;
    const totalPages = Math.ceil(filteredReviews.length / PAGE_SIZE);
    const currentPage = Math.min(page, Math.max(1, totalPages));
    const visibleReviews = filteredReviews.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );
    const changeRatingFilter = (stars) => {
        setRatingFilter((current) => (current === stars ? 0 : stars));
        setPage(1);
    };
    return (
        <section className="product-reviews" aria-labelledby="product-reviews-title">
            <ReviewForm
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                orderId={purchase?.orderId}
                item={purchase?.item}
                onSubmit={submitReview}
            />
            <div className="product-reviews-header">
                <div>
                    <h2 id="product-reviews-title">Ratings & Reviews</h2>
                    <p>Explore customer feedback and product ratings</p>
                </div>

                <div className="product-reviews-write">
                    <Button
                        variant="outlined"
                        disabled={!purchase}
                        onClick={() => setReviewOpen(true)}
                        startIcon={<i className="fa-regular fa-pen-to-square" aria-hidden="true" />}
                    >
                        Write a Review
                    </Button>
                    <small>
                        {purchase ? "Share your experience with this purchase" : eligibility}
                    </small>
                </div>
            </div>

            {/* Rating Summary */}
            <div className="product-reviews-summary">
                <div className="product-reviews-overall">
                    <div className="product-reviews-score">
                        <strong>{totalRatings ? averageRating.toFixed(1) : "—"}</strong>
                        <span>/ 5</span>
                    </div>

                    <Rating
                        className="product-reviews-stars"
                        value={totalRatings ? averageRating : 0}
                        precision={0.1}
                        readOnly
                    />

                    <p>
                        {totalRatings.toLocaleString("en-IN")}{" "}
                        {totalRatings === 1 ? "Rating" : "Ratings"}
                    </p>
                </div>

                <div className="product-reviews-distribution">
                    <h3>{"Rating Distribution"}</h3>

                    {[5, 4, 3, 2, 1].map((stars) => {
                        const count = reviews.filter(
                            (review) => Number(review.rating) === stars
                        ).length;
                        return (
                            <button
                                key={stars}
                                type="button"
                                className={`product-reviews-rating-filter ${ratingFilter === stars ? "is-selected" : ""}`}
                                aria-label={`Show ${stars}-star reviews`}
                                aria-pressed={ratingFilter === stars}
                                onClick={() => changeRatingFilter(stars)}
                            >
                                <span>
                                    {stars}
                                    <i className="fa-solid fa-star" aria-hidden="true" />
                                </span>

                                <progress
                                    value={count}
                                    max={Math.max(1, reviews.length)}
                                    aria-label={`${stars}-star review distribution`}
                                />

                                <span>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Review Toolbar */}
            <div className="product-reviews-toolbar">
                <div>
                    <h3>
                        Customer Feedback
                        <span> ({filteredReviews.length})</span>
                    </h3>

                    {ratingFilter > 0 && (
                        <button
                            type="button"
                            className="product-reviews-clear"
                            onClick={() => changeRatingFilter(ratingFilter)}
                        >
                            Clear {ratingFilter}-Star Filter
                        </button>
                    )}
                </div>

                <TextField
                    select
                    size="small"
                    label="Sort by"
                    className="product-reviews-sort"
                    value={sort}
                    onChange={(event) => {
                        setSort(event.target.value);
                        setPage(1);
                    }}
                >
                    <MenuItem value="recent">Most Recent</MenuItem>
                    <MenuItem value="highest">Highest Rating</MenuItem>
                    <MenuItem value="lowest">Lowest Rating</MenuItem>
                </TextField>
            </div>

            {/* Review List */}
            {visibleReviews.length > 0 ? (
                <ul className="product-reviews-list">
                    {visibleReviews.map((review, index) => {
                        const author = review.author || "Customer";
                        return (
                            <li key={review.id ?? review._id ?? `${author}-${index}`}>
                                <div className="product-reviews-avatar" aria-hidden="true">
                                    {review.avatar ? (
                                        <img
                                            src={review.avatar}
                                            alt=""
                                            onError={(event) => {
                                                event.currentTarget.hidden = true;
                                            }}
                                        />
                                    ) : null}
                                    <span>{author.trim().charAt(0).toUpperCase() || "C"}</span>
                                </div>

                                <div className="product-reviews-content">
                                    <div className="product-reviews-meta">
                                        <strong>{author}</strong>
                                        <time dateTime={review.createdAt || undefined}>
                                            {formatDate(review.createdAt)}
                                        </time>
                                    </div>

                                    <Rating
                                        className="product-reviews-stars"
                                        value={Number(review.rating)}
                                        readOnly
                                        size="small"
                                    />

                                    {review.title && <h4>{review.title}</h4>}
                                    <p>{review.comment}</p>
                                    {review.sellerReply?.text && (
                                        <blockquote className="product-review-reply">
                                            <strong>
                                                {review.sellerReply.storeName || "Seller"}
                                            </strong>
                                            <p>{review.sellerReply.text}</p>
                                        </blockquote>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="product-reviews-empty">
                    <i className="fa-regular fa-comment-dots" aria-hidden="true" />
                    <p>
                        {ratingFilter
                            ? `No ${ratingFilter}-star reviews found.`
                            : "No customer reviews yet."}
                    </p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="product-reviews-pagination">
                    <Pagination
                        className="product-reviews-pagination-control"
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, nextPage) => setPage(nextPage)}
                        shape="rounded"
                        siblingCount={1}
                    />
                </div>
            )}
        </section>
    );
}
export default function ProductReviews(props) {
    return (
        <ProductReviewsContent
            key={`${props.product?.productId || props.product?._id || "product"}`}
            {...props}
        />
    );
}
