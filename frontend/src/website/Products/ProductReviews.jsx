
import { useEffect, useMemo, useState } from "react";
import { Button, MenuItem, Pagination, Rating, TextField } from "@mui/material";

const PAGE_SIZE = 3;

// Sample feedback for product previews.
const sampleComments = {
    "preview-smartphone": [
        "Storage options are clearly listed and the phone is great for everyday tasks.",
        "I liked the clean design and the available colour options.",
        "The selected configuration matched the product details.",
        "A practical choice for regular use and entertainment.",
        "More colours would be nice, but the existing options are good.",
    ],
    "preview-laptop": [
        "The RAM options helped me select a configuration for work.",
        "A good choice for documents and everyday browsing.",
        "The SSD storage details were clearly mentioned.",
        "Simple design that fits well into my desk setup.",
        "More configuration options would be helpful.",
    ],
    "preview-headphones": [
        "The over-ear design feels comfortable for everyday listening.",
        "The black finish looks clean and stylish.",
        "Good option for music and podcasts.",
        "The padded ear cushions are a useful feature.",
        "More colour options would improve the selection.",
    ],
    "preview-shirt": [
        "The navy colour is versatile and easy to style.",
        "The regular fit works well for casual outfits.",
        "Size selection was simple and clear.",
        "Looks great with jeans and casual trousers.",
        "Additional colours would be a nice improvement.",
    ],
    "preview-dress": [
        "A lovely design for everyday outfits.",
        "The available size options were easy to understand.",
        "The style looks suitable for casual occasions.",
        "I really liked the overall appearance.",
        "More colour options would make the range better.",
    ],
    "preview-kids": [
        "The size selection was easy to understand.",
        "A practical outfit for everyday activities.",
        "The design looks cheerful and comfortable.",
        "The description helped when selecting a size.",
        "A wider size range would be useful.",
    ],
    "preview-shoes": [
        "The design looks great for daily casual wear.",
        "The size options were easy to compare.",
        "They look good with everyday outfits.",
        "The overall design is neat and stylish.",
        "More colours would make the selection better.",
    ],
    "preview-watch": [
        "The watch face looks clean and easy to read.",
        "The classic design works with different outfits.",
        "The product images show the details clearly.",
        "A stylish accessory for everyday use.",
        "More strap options would be welcome.",
    ],
    "preview-personal-care": [
        "The pack details were clear and easy to compare.",
        "A useful product for everyday essentials.",
        "The description helped me select the right option.",
        "Simple packaging and clear information.",
        "More pack options would be helpful.",
    ],
    "preview-pantry": [
        "The available pack sizes are clearly listed.",
        "A useful everyday item for the kitchen.",
        "Comparing different quantities was easy.",
        "The product information is straightforward.",
        "More pack sizes would make shopping easier.",
    ],
    "preview-snacks": [
        "A convenient snack option for regular grocery orders.",
        "The available packs are easy to compare.",
        "Good for keeping quick snacks at home.",
        "Pack details and images are helpful.",
        "More varieties would improve the selection.",
    ],
    "preview-beauty": [
        "The product details helped me compare the options.",
        "The packaging and presentation look good.",
        "A nice addition to an everyday routine.",
        "The available variations are easy to understand.",
        "More shades and options would be welcome.",
    ],
    "preview-kitchen": [
        "A practical product for everyday kitchen tasks.",
        "The size and specifications are clearly described.",
        "The design fits nicely into a regular kitchen.",
        "The product details were helpful.",
        "Additional size options would be useful.",
    ],
    "preview-backpack": [
        "A useful bag for work and daily essentials.",
        "The design looks practical for regular travel.",
        "Product images show the overall shape clearly.",
        "I like the simple and versatile styling.",
        "More colour options would be great.",
    ],
    "preview-trolley": [
        "The luggage design looks practical for travelling.",
        "The details helped when comparing sizes.",
        "A smart-looking option for travel essentials.",
        "The product photos show the design clearly.",
        "More sizes and colours would improve the range.",
    ],
    "preview-travel": [
        "A convenient addition to everyday travel essentials.",
        "The product design looks practical and easy to use.",
        "The specifications were helpful while comparing options.",
        "A useful accessory for regular journeys.",
        "More size options would be useful.",
    ],
};

const sampleReviewers = [
    { name: "Aditi S.", rating: 5, title: "Great choice", date: "2026-10-28" },
    { name: "Rahul P.", rating: 4, title: "Good overall", date: "2026-10-23" },
    { name: "Sneha R.", rating: 5, title: "As described", date: "2026-10-18" },
    { name: "Aman K.", rating: 4, title: "Happy with it", date: "2026-10-12" },
    { name: "Priya M.", rating: 3, title: "Room for improvement", date: "2026-10-05" },
];

const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

// ================== PRODUCT REVIEWS ==================
function ProductReviews({ product }) {
    const [ratingFilter, setRatingFilter] = useState(0);
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);

    const isPreview = !Array.isArray(product?.reviews);

    useEffect(() => {
        setRatingFilter(0);
        setSort("recent");
        setPage(1);
    }, [product?._id]);

    const reviews = useMemo(() => {
        if (Array.isArray(product?.reviews)) {
            return product.reviews.filter((review) => (
                Number.isInteger(Number(review.rating)) &&
                Number(review.rating) >= 1 &&
                Number(review.rating) <= 5
            ));
        }

        return (sampleComments[product?._id] || []).map((comment, index) => ({
            id: `${product._id}-${index}`,
            author: sampleReviewers[index].name,
            rating: sampleReviewers[index].rating,
            title: sampleReviewers[index].title,
            comment,
            createdAt: sampleReviewers[index].date,
        }));
    }, [product]);

    const filteredReviews = useMemo(() => {
        const result = reviews.filter((review) => (
            ratingFilter === 0 || Number(review.rating) === ratingFilter
        ));

        return [...result].sort((a, b) => {
            if (sort === "highest") return Number(b.rating) - Number(a.rating);
            if (sort === "lowest") return Number(a.rating) - Number(b.rating);

            return (new Date(b.createdAt).getTime() || 0) -
                (new Date(a.createdAt).getTime() || 0);
        });
    }, [reviews, ratingFilter, sort]);

    const catalogRating = Number(product?.rating);
    const catalogCount = Number(product?.ratingCount);

    const totalRatings = Number.isInteger(catalogCount) && catalogCount > 0
        ? catalogCount : reviews.length;

    const averageRating = Number.isFinite(catalogRating) &&
        catalogRating >= 0 && catalogRating <= 5 && catalogCount > 0
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
        setRatingFilter((current) => current === stars ? 0 : stars);
        setPage(1);
    };

    return (
        <section className="product-reviews" aria-labelledby="product-reviews-title">
            <div className="product-reviews-header">
                <div>
                    <h2 id="product-reviews-title">Ratings & Reviews</h2>
                    <p>Explore customer feedback and product ratings</p>
                </div>

                <div className="product-reviews-write">
                    <Button
                        variant="outlined"
                        disabled
                        startIcon={<i className="fa-regular fa-pen-to-square" aria-hidden="true" />}
                    >
                        Write a Review
                    </Button>
                    <small>Available after a delivered purchase</small>
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
                    <h3>{isPreview ? "Sample Review Distribution" : "Rating Distribution"}</h3>

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

                    {isPreview && <p>Sample feedback for product preview</p>}

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
                        const initials = author.split(" ").filter(Boolean)
                            .slice(0, 2).map((name) => name[0].toUpperCase()).join("");

                        return (
                            <li key={review.id ?? review._id ?? `${author}-${index}`}>
                                <div className="product-reviews-avatar" aria-hidden="true">
                                    {initials}
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

export default ProductReviews;
