import api from "../services/api";
import { useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Rating,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

const MAX_REVIEW_LENGTH = 800;

const ratingLabels = {
    1: "Very Poor",
    2: "Poor",
    3: "Average",
    4: "Good",
    5: "Excellent",
};

function getProductName(item) {
    return (
        item?.productSnapshot?.name ||
        item?.product?.name ||
        item?.productName ||
        item?.name ||
        item?.title ||
        "Product"
    );
}

function getProductImage(item) {
    const image =
        item?.productSnapshot?.image ||
        item?.product?.images?.[0] ||
        item?.product?.image ||
        item?.image;

    return typeof image === "string" ? image : image?.url || image?.secure_url || "";
}

function getProductId(item) {
    const productId =
        item?.productId ||
        item?.productSnapshot?.productId ||
        item?.product?._id ||
        item?.product?.id ||
        null;

    return typeof productId === "object" ? productId?._id || productId?.id || null : productId;
}

function getOrderItemId(item) {
    return item?.orderItemId || item?._id || item?.id || null;
}

function ReviewFormContent({ open = false, onClose, orderId, item = null, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState("");
    const [ratingError, setRatingError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);

    const productName = getProductName(item);
    const productImage = getProductImage(item);

    const variantName =
        item?.variantName || item?.productSnapshot?.variantLabel || item?.variantLabel || "";

    // Reset form when another product is selected.

    const handleClose = () => {
        if (submitting) return;

        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!item) {
            toast.error("Product information is unavailable.");
            return;
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            setRatingError("Please select a rating from 1 to 5 stars.");
            return;
        }

        const comment = review.trim();

        if (comment.length > MAX_REVIEW_LENGTH) {
            toast.error("Review must not exceed 800 characters.");
            return;
        }

        const payload = {
            orderId,
            orderItemId: getOrderItemId(item),
            productId: getProductId(item),
            variantId: item?.variantId || item?.productSnapshot?.variantId || null,
            rating,
            comment,
        };

        try {
            setSubmitting(true);

            const result = onSubmit
                ? await onSubmit(payload)
                : (await api.post("/reviews", payload)).data;

            if (result?.success !== true) {
                toast.error(result?.message || "Review submission could not be confirmed.");
                return;
            }

            toast.success("Your review has been submitted.");
            onClose?.();
        } catch (error) {
            toast.error(error.message || "Unable to submit your review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            className="customer-review-dialog"
            aria-labelledby="customer-review-dialog-title"
        >
            {/* Dialog Header */}
            <DialogTitle id="customer-review-dialog-title">
                <div className="customer-review-dialog-heading">
                    <span className="customer-review-heading-icon">
                        <i className="fa-solid fa-star" aria-hidden="true" />
                    </span>

                    <div>
                        <h2>Rate & Review Product</h2>

                        <p>Share your experience with this product.</p>
                    </div>
                </div>
            </DialogTitle>

            <DialogContent dividers>
                <form id="customer-review-form" onSubmit={handleSubmit} noValidate>
                    {/* Selected Product */}
                    <div className="customer-review-product">
                        <div className="customer-review-product-image">
                            {productImage && !imageFailed ? (
                                <img
                                    src={productImage}
                                    alt={productName}
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <i className="fa-solid fa-box-open" aria-hidden="true" />
                            )}
                        </div>

                        <div className="customer-review-product-info">
                            <span>YOUR PURCHASE</span>

                            <h3>{productName}</h3>

                            {variantName && <p>{variantName}</p>}

                            <span className="customer-review-delivered">
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                Delivered Product
                            </span>
                        </div>
                    </div>

                    {/* Star Rating */}
                    <div className="customer-review-rating-section">
                        <span className="customer-review-section-label">
                            YOUR RATING <b>*</b>
                        </span>

                        <h3>How was your experience?</h3>

                        <p>
                            Select the stars that best describe your experience with this product.
                        </p>

                        <div className="customer-review-stars">
                            <Rating
                                name="product-rating"
                                value={rating}
                                onChange={(_, value) => {
                                    setRating(value || 0);
                                    setRatingError("");
                                }}
                                size="large"
                                precision={1}
                                disabled={submitting}
                                aria-label="Product rating"
                            />

                            <span className={rating ? "has-rating" : ""}>
                                {rating ? ratingLabels[rating] : "Select a rating"}
                            </span>
                        </div>

                        {ratingError && (
                            <p className="customer-review-error" role="alert">
                                {ratingError}
                            </p>
                        )}
                    </div>

                    {/* Written Review */}
                    <div className="customer-review-text-section">
                        <div className="customer-review-section-heading">
                            <span className="customer-review-section-label">WRITE A REVIEW</span>

                            <span>Optional</span>
                        </div>

                        <TextField
                            name="review"
                            value={review}
                            onChange={(event) => setReview(event.target.value)}
                            placeholder="What did you like or dislike about this product?"
                            multiline
                            minRows={4}
                            maxRows={7}
                            fullWidth
                            size="small"
                            disabled={submitting}
                            slotProps={{
                                htmlInput: {
                                    maxLength: MAX_REVIEW_LENGTH,
                                },
                            }}
                        />

                        <div className="customer-review-character-count">
                            <span>
                                Share useful details about product quality and your experience.
                            </span>

                            <span>
                                {review.length}/{MAX_REVIEW_LENGTH}
                            </span>
                        </div>
                    </div>

                    {/* Review Guidelines */}
                    <div className="customer-review-guidelines">
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />

                        <p>
                            Reviews should reflect your own experience. Please avoid personal
                            information, offensive content or unrelated comments.
                        </p>
                    </div>
                </form>
            </DialogContent>

            <DialogActions className="customer-review-dialog-actions">
                <button
                    type="button"
                    className="customer-review-cancel-button"
                    onClick={handleClose}
                    disabled={submitting}
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    form="customer-review-form"
                    className="customer-review-submit-button"
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                            Submit Review
                        </>
                    )}
                </button>
            </DialogActions>
        </Dialog>
    );
}

export default function ReviewForm(props) {
    if (!props.open) return null;
    return (
        <ReviewFormContent
            key={`${props.orderId}-${props.item?.orderItemId || props.item?._id || props.item?.id}`}
            {...props}
        />
    );
}
