
import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    MenuItem,
    Pagination,
    Rating,
    TextField,
} from "@mui/material";

const PAGE_SIZE = 3;

const colors = {
    primary: "var(--color-primary)",
    accent: "var(--color-accent)",
    muted: "var(--color-muted)",
    text: "var(--color-text)",
    border: "var(--color-border)",
    background: "var(--website-page-bg, #ffffff)",
    soft: "#fff8f2",
    stars: "#c47b0b",
};

// Sample reviews for UI preview.
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

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-IN", {
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
            return product.reviews.filter((review) => {
                const rating = Number(review.rating);
                return Number.isInteger(rating) && rating >= 1 && rating <= 5;
            });
        }

        const comments = sampleComments[product?._id] || [];

        return comments.map((comment, index) => ({
            id: `${product._id}-review-${index + 1}`,
            author: sampleReviewers[index].name,
            rating: sampleReviewers[index].rating,
            title: sampleReviewers[index].title,
            comment,
            createdAt: sampleReviewers[index].date,
        }));
    }, [product]);

    const ratingCounts = useMemo(() => (
        [5, 4, 3, 2, 1].map((stars) => ({
            stars,
            count: reviews.filter(
                (review) => Number(review.rating) === stars
            ).length,
        }))
    ), [reviews]);

    const filteredReviews = useMemo(() => {
        const result = reviews.filter((review) => (
            ratingFilter === 0 || Number(review.rating) === ratingFilter
        ));

        return [...result].sort((a, b) => {
            if (sort === "highest") {
                return Number(b.rating) - Number(a.rating);
            }

            if (sort === "lowest") {
                return Number(a.rating) - Number(b.rating);
            }

            return (
                (new Date(b.createdAt).getTime() || 0)
                - (new Date(a.createdAt).getTime() || 0)
            );
        });
    }, [reviews, ratingFilter, sort]);

    const totalPages = Math.ceil(filteredReviews.length / PAGE_SIZE);
    const currentPage = Math.min(page, Math.max(1, totalPages));

    const visibleReviews = filteredReviews.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const catalogRating = Number(product?.rating);
    const catalogCount = Number(product?.ratingCount);

    const averageRating = Number.isFinite(catalogRating)
        && catalogRating >= 0 && catalogRating <= 5
        && catalogCount > 0
        ? catalogRating
        : reviews.length
            ? reviews.reduce(
                (total, review) => total + Number(review.rating), 0
            ) / reviews.length
            : 0;

    const totalRatings = Number.isInteger(catalogCount) && catalogCount > 0
        ? catalogCount
        : reviews.length;

    const changeRatingFilter = (stars) => {
        setRatingFilter((current) => current === stars ? 0 : stars);
        setPage(1);
    };

    return (
        <Box
            component="section"
            aria-labelledby="product-reviews-title"
            sx={{
                mt: { xs: 3, md: 4 },
                px: { xs: 2, sm: 3 },
                py: { xs: 2.5, sm: 3 },
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "14px",
            }}
        >
            {/* Section Heading */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box>
                    <Box
                        component="h2"
                        id="product-reviews-title"
                        sx={{
                            m: 0,
                            pl: 1.5,
                            borderLeft: `4px solid ${colors.accent}`,
                            color: colors.primary,
                            fontSize: { xs: "1.125rem", sm: "1.375rem" },
                            fontWeight: 700,
                            lineHeight: 1.4,
                        }}
                    >
                        Ratings & Reviews
                    </Box>

                    <Box
                        component="p"
                        sx={{
                            m: "8px 0 0",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            color: colors.muted,
                        }}
                    >
                        Explore customer feedback and product ratings
                    </Box>
                </Box>

                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Button
                        variant="outlined"
                        disabled
                        startIcon={
                            <i
                                className="fa-regular fa-pen-to-square"
                                aria-hidden="true"
                                style={{ fontSize: "0.875rem" }}
                            />
                        }
                        sx={{
                            px: 2,
                            py: 1,
                            fontFamily: "inherit",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: "9px",
                        }}
                    >
                        Write a Review
                    </Button>

                    <Box
                        sx={{
                            mt: 0.75,
                            fontSize: "0.75rem",
                            color: colors.muted,
                        }}
                    >
                        Available after a delivered purchase
                    </Box>
                </Box>
            </Box>

            {/* Rating Summary */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "220px minmax(0, 1fr)",
                    },
                    alignItems: "center",
                    gap: { xs: 2.5, md: 4 },
                    p: { xs: 2, sm: 3 },
                    mb: 3.5,
                    backgroundColor: colors.soft,
                    border: "1px solid #f2e5da",
                    borderRadius: "12px",
                }}
            >
                {/* Overall Rating */}
                <Box
                    sx={{
                        textAlign: { xs: "center", md: "left" },
                        borderRight: {
                            xs: "none",
                            md: "1px solid #e9dcd2",
                        },
                        pr: { md: 3 },
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: {
                                xs: "center",
                                md: "flex-start",
                            },
                            gap: 1,
                        }}
                    >
                        <Box
                            component="strong"
                            sx={{
                                color: colors.primary,
                                fontSize: { xs: "2.25rem", md: "2.75rem" },
                                fontWeight: 750,
                                lineHeight: 1.2,
                            }}
                        >
                            {totalRatings ? averageRating.toFixed(1) : "—"}
                        </Box>

                        <Box
                            component="span"
                            sx={{
                                fontSize: "0.875rem",
                                color: colors.muted,
                            }}
                        >
                            / 5
                        </Box>
                    </Box>

                    <Rating
                        value={totalRatings ? averageRating : 0}
                        precision={0.1}
                        readOnly
                        sx={{
                            mt: 0.5,
                            color: colors.stars,
                            fontSize: "1.4rem",
                        }}
                    />

                    <Box
                        sx={{
                            mt: 0.75,
                            fontSize: "0.875rem",
                            color: colors.muted,
                        }}
                    >
                        {totalRatings.toLocaleString("en-IN")}{" "}
                        {totalRatings === 1 ? "Rating" : "Ratings"}
                    </Box>
                </Box>

                {/* Rating Distribution */}
                <Box sx={{ width: "100%", maxWidth: 680 }}>
                    <Box
                        component="h3"
                        sx={{
                            m: "0 0 15px",
                            fontSize: "0.9375rem",
                            fontWeight: 700,
                            color: colors.primary,
                        }}
                    >
                        {isPreview
                            ? "Sample Review Distribution"
                            : "Rating Distribution"}
                    </Box>

                    <Box sx={{ display: "grid", gap: 1.25 }}>
                        {ratingCounts.map(({ stars, count }) => {
                            const percentage = reviews.length
                                ? (count / reviews.length) * 100
                                : 0;

                            return (
                                <Box
                                    component="button"
                                    key={stars}
                                    type="button"
                                    onClick={() => changeRatingFilter(stars)}
                                    aria-label={`Show ${stars}-star reviews`}
                                    aria-pressed={ratingFilter === stars}
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "44px minmax(0, 1fr) 28px",
                                        alignItems: "center",
                                        gap: { xs: 1.5, sm: 2 },
                                        width: "100%",
                                        p: "3px 6px",
                                        border: "1px solid",
                                        borderColor: ratingFilter === stars
                                            ? colors.accent
                                            : "transparent",
                                        borderRadius: "7px",
                                        backgroundColor: ratingFilter === stars
                                            ? "#ffead9"
                                            : "transparent",
                                        fontFamily: "inherit",
                                        cursor: "pointer",
                                        transition: "background-color 150ms ease",
                                        "&:hover": {
                                            backgroundColor: "#ffead9",
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            color: colors.primary,
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {stars}
                                        <i
                                            className="fa-solid fa-star"
                                            aria-hidden="true"
                                            style={{
                                                fontSize: "0.6875rem",
                                                color: colors.stars,
                                            }}
                                        />
                                    </Box>

                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: 9,
                                            overflow: "hidden",
                                            borderRadius: "20px",
                                            backgroundColor: "#e8e8eb",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: `${percentage}%`,
                                                height: "100%",
                                                backgroundColor: colors.accent,
                                                borderRadius: "20px",
                                            }}
                                        />
                                    </Box>

                                    <Box
                                        component="span"
                                        sx={{
                                            textAlign: "right",
                                            fontSize: "0.8125rem",
                                            fontWeight: 500,
                                            color: colors.muted,
                                        }}
                                    >
                                        {count}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>

            {/* Reviews Toolbar */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                    pb: 2,
                    borderBottom: `1px solid ${colors.border}`,
                }}
            >
                <Box>
                    <Box
                        component="h3"
                        sx={{
                            m: 0,
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            color: colors.primary,
                        }}
                    >
                        Customer Feedback

                        <Box
                            component="span"
                            sx={{
                                ml: 1,
                                fontSize: "0.875rem",
                                color: colors.muted,
                                fontWeight: 500,
                            }}
                        >
                            ({filteredReviews.length})
                        </Box>
                    </Box>

                    {isPreview && (
                        <Box
                            component="p"
                            sx={{
                                m: "5px 0 0",
                                fontSize: "0.75rem",
                                color: colors.muted,
                            }}
                        >
                            Sample feedback for product preview
                        </Box>
                    )}

                    {ratingFilter > 0 && (
                        <Button
                            size="small"
                            onClick={() => changeRatingFilter(ratingFilter)}
                            sx={{
                                mt: 0.75,
                                p: 0,
                                minWidth: 0,
                                color: colors.accent,
                                fontFamily: "inherit",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                textTransform: "none",
                            }}
                        >
                            Clear {ratingFilter}-Star Filter
                        </Button>
                    )}
                </Box>

                <TextField
                    select
                    size="small"
                    label="Sort by"
                    value={sort}
                    onChange={(event) => {
                        setSort(event.target.value);
                        setPage(1);
                    }}
                    sx={{
                        width: { xs: "100%", sm: 185 },
                        "& .MuiOutlinedInput-root": {
                            fontFamily: "inherit",
                            fontSize: "0.875rem",
                            borderRadius: "9px",
                            backgroundColor: "#ffffff",
                        },
                        "& .MuiInputLabel-root": {
                            fontFamily: "inherit",
                            fontSize: "0.875rem",
                        },
                        "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                            borderColor: colors.accent,
                        },
                        "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.primary,
                        },
                    }}
                >
                    <MenuItem value="recent">Most Recent</MenuItem>
                    <MenuItem value="highest">Highest Rating</MenuItem>
                    <MenuItem value="lowest">Lowest Rating</MenuItem>
                </TextField>
            </Box>

            {/* Review List */}
            {visibleReviews.length > 0 ? (
                <Box
                    component="ul"
                    sx={{
                        m: 0,
                        p: 0,
                        listStyle: "none",
                    }}
                >
                    {visibleReviews.map((review, index) => {
                        const author = review.author || "Customer";

                        const initials = author
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((name) => name[0].toUpperCase())
                            .join("");

                        return (
                            <Box
                                component="li"
                                key={
                                    review.id ??
                                    review._id ??
                                    `${author}-${index}`
                                }
                                sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: { xs: 1.5, sm: 2 },
                                    py: { xs: 2.5, sm: 3 },
                                    borderBottom: `1px solid ${colors.border}`,
                                }}
                            >
                                {/* Reviewer Avatar */}
                                <Box
                                    aria-hidden="true"
                                    sx={{
                                        display: "flex",
                                        flexShrink: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 44,
                                        height: 44,
                                        borderRadius: "50%",
                                        backgroundColor: "#fff0e3",
                                        color: colors.primary,
                                        fontSize: "0.875rem",
                                        fontWeight: 700,
                                    }}
                                >
                                    {initials}
                                </Box>

                                {/* Review Details */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: 1,
                                        }}
                                    >
                                        <Box
                                            component="strong"
                                            sx={{
                                                fontSize: "0.9375rem",
                                                fontWeight: 700,
                                                color: colors.primary,
                                            }}
                                        >
                                            {author}
                                        </Box>

                                        <Box
                                            component="time"
                                            dateTime={review.createdAt || undefined}
                                            sx={{
                                                fontSize: "0.8125rem",
                                                color: colors.muted,
                                            }}
                                        >
                                            {formatDate(review.createdAt)}
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            mt: 0.75,
                                        }}
                                    >
                                        <Rating
                                            value={Number(review.rating)}
                                            readOnly
                                            size="small"
                                            sx={{
                                                fontSize: "1rem",
                                                color: colors.stars,
                                            }}
                                        />
                                    </Box>

                                    {review.title && (
                                        <Box
                                            component="h4"
                                            sx={{
                                                mt: 1,
                                                mb: 0.5,
                                                fontSize: "0.9375rem",
                                                fontWeight: 700,
                                                color: colors.text,
                                            }}
                                        >
                                            {review.title}
                                        </Box>
                                    )}

                                    <Box
                                        component="p"
                                        sx={{
                                            m: 0,
                                            maxWidth: 950,
                                            fontSize: "0.875rem",
                                            lineHeight: 1.75,
                                            color: colors.muted,
                                        }}
                                    >
                                        {review.comment}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 180,
                        py: 4,
                        textAlign: "center",
                    }}
                >
                    <i
                        className="fa-regular fa-comment-dots"
                        aria-hidden="true"
                        style={{
                            fontSize: "1.75rem",
                            color: colors.muted,
                        }}
                    />

                    <Box
                        component="p"
                        sx={{
                            mt: 2,
                            mb: 0,
                            fontSize: "0.9375rem",
                            color: colors.muted,
                        }}
                    >
                        {ratingFilter
                            ? `No ${ratingFilter}-star reviews found.`
                            : "No customer reviews yet."}
                    </Box>
                </Box>
            )}

            {/* Review Pagination */}
            {totalPages > 1 && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        pt: 3,
                    }}
                >
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, nextPage) => setPage(nextPage)}
                        shape="rounded"
                        siblingCount={1}
                        sx={{
                            "& .MuiPaginationItem-root": {
                                fontFamily: "inherit",
                                fontSize: "0.875rem",
                                color: colors.primary,
                            },
                            "& .MuiPaginationItem-root.Mui-selected": {
                                backgroundColor: "#fff0e3",
                                border: `1px solid ${colors.accent}`,
                                "&:hover": {
                                    backgroundColor: "#ffe4cf",
                                },
                            },
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}

export default ProductReviews;
