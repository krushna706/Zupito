
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

// ================== PRODUCT FILTERS ==================
function ProductFilters({
    categories = [],
    filters,
    priceBounds = [0, 100000],
    onChange,
    onClear,
}) {
    const filterId = useId();
    const [minPrice, maxPrice] = priceBounds;

    const selectedCategories = filters.categories || [];
    const priceRange = filters.priceRange || priceBounds;
    const minRating = filters.minRating || 0;
    const inStockOnly = Boolean(filters.inStockOnly);

    const hasActiveFilters =
        selectedCategories.length > 0 ||
        priceRange[0] !== minPrice ||
        priceRange[1] !== maxPrice ||
        minRating > 0 ||
        inStockOnly;

    const changeCategory = (id, checked) => {
        const categories = checked
            ? [...new Set([...selectedCategories, id])]
            : selectedCategories.filter((category) => category !== id);

        onChange({ categories });
    };

    return (
        <div className="product-filters">
            <div className="product-filters-header">
                <h2 className="product-filters-title">Filters</h2>

                <Button
                    size="small"
                    className="product-filters-clear"
                    onClick={onClear}
                    disabled={!hasActiveFilters}
                >
                    Clear all
                </Button>
            </div>

            {/* Category */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-category`}
            >
                <h3 id={`${filterId}-category`} className="product-filter-heading">
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
                                    className="product-filter-control"
                                    checked={selectedCategories.includes(category.id)}
                                    onChange={(_, checked) => changeCategory(category.id, checked)}
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
                        <p className="product-filter-note">No categories available.</p>
                    )}
                </div>
            </section>

            {/* Price Range */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-price`}
            >
                <h3 id={`${filterId}-price`} className="product-filter-heading">
                    Price range
                </h3>

                <div className="product-filter-price-values">
                    <span>{priceFormatter.format(priceRange[0])}</span>
                    <span>{priceFormatter.format(priceRange[1])}</span>
                </div>

                <div className="product-filter-slider">
                    <Slider
                        className="product-price-slider"
                        value={priceRange}
                        min={minPrice}
                        max={maxPrice}
                        step={1}
                        disabled={minPrice >= maxPrice}
                        disableSwap
                        onChange={(_, value) => {
                            if (Array.isArray(value)) onChange({ priceRange: value });
                        }}
                        getAriaLabel={(index) => index === 0 ? "Minimum price" : "Maximum price"}
                        getAriaValueText={priceFormatter.format}
                        valueLabelDisplay="auto"
                        valueLabelFormat={priceFormatter.format}
                    />
                </div>
            </section>

            {/* Customer Rating */}
            <section
                className="product-filter-group"
                aria-labelledby={`${filterId}-rating`}
            >
                <h3 id={`${filterId}-rating`} className="product-filter-heading">
                    Customer rating
                </h3>

                <RadioGroup
                    aria-labelledby={`${filterId}-rating`}
                    name={`${filterId}-rating`}
                    value={String(minRating)}
                    onChange={(event) => onChange({
                        minRating: Number(event.target.value),
                    })}
                >
                    <FormControlLabel
                        value="0"
                        className="product-filter-option"
                        control={<Radio size="small" className="product-filter-control" />}
                        label="All ratings"
                    />

                    {[4, 3, 2].map((rating) => (
                        <FormControlLabel
                            key={rating}
                            value={String(rating)}
                            className="product-filter-option"
                            control={<Radio size="small" className="product-filter-control" />}
                            label={
                                <span className="product-filter-rating-label">
                                    <span aria-hidden="true">
                                        <Rating value={rating} readOnly size="small" />
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
                <h3 id={`${filterId}-availability`} className="product-filter-heading">
                    Availability
                </h3>

                <FormControlLabel
                    className="product-filter-option"
                    control={
                        <Checkbox
                            size="small"
                            className="product-filter-control"
                            checked={inStockOnly}
                            onChange={(_, checked) => onChange({ inStockOnly: checked })}
                        />
                    }
                    label="In stock only"
                />
            </section>
        </div>
    );
}

export default ProductFilters;
