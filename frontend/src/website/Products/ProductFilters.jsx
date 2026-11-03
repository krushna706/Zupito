import { useId } from "react";
import {
    Button,
    Checkbox,
    FormControlLabel,
    Radio,
    RadioGroup,
    Rating,
    Slider,
} from "@mui/material";

const priceFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const controlStyles = {
    color: "var(--color-muted)",
    "&.Mui-checked": {
        color: "var(--color-accent)",
    },
};

// ================== PRODUCT FILTERS ==================
function ProductFilters({
    categories = [],
    filters,
    priceBounds = [0, 100000],
    onChange,
    onClear,
}) {
    const filterId = useId();
    const [minimumPrice, maximumPrice] = priceBounds;

    const selectedCategories = filters.categories || [];
    const selectedPrice = filters.priceRange || priceBounds;
    const minimumRating = filters.minRating || 0;
    const inStockOnly = Boolean(filters.inStockOnly);

    const hasActiveFilters =
        selectedCategories.length > 0
        || selectedPrice[0] !== minimumPrice
        || selectedPrice[1] !== maximumPrice
        || minimumRating > 0
        || inStockOnly;

    const changeCategory = (categoryId, checked) => {
        const nextCategories = checked
            ? [...new Set([...selectedCategories, categoryId])]
            : selectedCategories.filter((id) => id !== categoryId);

        onChange({ categories: nextCategories });
    };

    return (
        <div className="product-filters">
            <div className="product-filters-header">
                <h2 className="product-filters-title">Filters</h2>

                <Button
                    type="button"
                    size="small"
                    onClick={onClear}
                    disabled={!hasActiveFilters}
                    sx={{
                        minWidth: "auto",
                        fontFamily: "inherit",
                        fontWeight: 600,
                        textTransform: "none",
                        color: "var(--color-primary)",
                    }}
                >
                    Clear all
                </Button>
            </div>

            {/* Category */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-category`}
            >
                <h3
                    id={`${filterId}-category`}
                    className="product-filter-heading"
                >
                    Category
                </h3>

                <div className="product-filter-options">
                    {categories.map((category) => (
                        <FormControlLabel
                            key={category.id}
                            className="product-filter-option"
                            control={
                                <Checkbox
                                    size="small"
                                    checked={selectedCategories.includes(
                                        category.id
                                    )}
                                    onChange={(_, checked) => {
                                        changeCategory(category.id, checked);
                                    }}
                                    sx={controlStyles}
                                />
                            }
                            label={
                                <span className="product-filter-option-label">
                                    <span>{category.name}</span>

                                    {Number.isInteger(category.count) && (
                                        <span className="product-filter-count">
                                            ({category.count})
                                        </span>
                                    )}
                                </span>
                            }
                        />
                    ))}

                    {categories.length === 0 && (
                        <p className="product-filter-note">
                            No categories available.
                        </p>
                    )}
                </div>
            </section>

            {/* Price */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-price`}
            >
                <h3
                    id={`${filterId}-price`}
                    className="product-filter-heading"
                >
                    Price range
                </h3>

                <div className="product-filter-price-values">
                    <span>{priceFormatter.format(selectedPrice[0])}</span>
                    <span>{priceFormatter.format(selectedPrice[1])}</span>
                </div>

                <div className="product-filter-slider">
                    <Slider
                        value={selectedPrice}
                        min={minimumPrice}
                        max={maximumPrice}
                        step={1}
                        disabled={minimumPrice >= maximumPrice}
                        disableSwap
                        onChange={(_, value) => {
                            if (Array.isArray(value)) {
                                onChange({ priceRange: value });
                            }
                        }}
                        getAriaLabel={(index) => (
                            index === 0 ? "Minimum price" : "Maximum price"
                        )}
                        getAriaValueText={(value) => (
                            priceFormatter.format(value)
                        )}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => (
                            priceFormatter.format(value)
                        )}
                        sx={{
                            color: "var(--color-accent)",
                            height: 4,
                            "& .MuiSlider-thumb": {
                                width: 16,
                                height: 16,
                                backgroundColor: "#ffffff",
                                border: "2px solid currentColor",
                                "&:hover, &.Mui-focusVisible": {
                                    boxShadow:
                                        "0 0 0 7px rgb(255 106 0 / 12%)",
                                },
                                "&.Mui-active": {
                                    boxShadow:
                                        "0 0 0 9px rgb(255 106 0 / 14%)",
                                },
                            },
                            "& .MuiSlider-rail": {
                                opacity: 0.2,
                            },
                            "& .MuiSlider-valueLabel": {
                                fontFamily: "inherit",
                                fontSize: "0.75rem",
                                backgroundColor: "var(--color-primary)",
                                borderRadius: "6px",
                            },
                        }}
                    />
                </div>
            </section>

            {/* Rating */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-rating`}
            >
                <h3
                    id={`${filterId}-rating`}
                    className="product-filter-heading"
                >
                    Customer rating
                </h3>

                <RadioGroup
                    aria-labelledby={`${filterId}-rating`}
                    name={`${filterId}-rating`}
                    value={String(minimumRating)}
                    onChange={(event) => {
                        onChange({
                            minRating: Number(event.target.value),
                        });
                    }}
                >
                    <FormControlLabel
                        value="0"
                        className="product-filter-option"
                        control={
                            <Radio size="small" sx={controlStyles} />
                        }
                        label="All ratings"
                    />

                    {[4, 3, 2].map((rating) => (
                        <FormControlLabel
                            key={rating}
                            value={String(rating)}
                            className="product-filter-option"
                            control={
                                <Radio size="small" sx={controlStyles} />
                            }
                            label={
                                <span className="product-filter-rating-label">
                                    <span aria-hidden="true">
                                        <Rating
                                            value={rating}
                                            readOnly
                                            size="small"
                                            sx={{ color: "#b77912" }}
                                        />
                                    </span>

                                    <span aria-hidden="true">& above</span>

                                    <span className="visually-hidden">
                                        {rating} stars and above
                                    </span>
                                </span>
                            }
                        />
                    ))}
                </RadioGroup>
            </section>

            {/* Availability */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-availability`}
            >
                <h3
                    id={`${filterId}-availability`}
                    className="product-filter-heading"
                >
                    Availability
                </h3>

                <FormControlLabel
                    className="product-filter-option"
                    control={
                        <Checkbox
                            size="small"
                            checked={inStockOnly}
                            onChange={(_, checked) => {
                                onChange({ inStockOnly: checked });
                            }}
                            sx={controlStyles}
                        />
                    }
                    label="In stock only"
                />
            </section>
        </div>
    );
}

export default ProductFilters;