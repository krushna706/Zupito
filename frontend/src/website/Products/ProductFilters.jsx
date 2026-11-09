import { useId } from "react";
import {
    Button,
    Checkbox,
    FormControlLabel,
    Slider,
} from "@mui/material";

const priceFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

function ProductFilters({
    categories = [],
    brands = [],
    attributes = [],
    filters,
    priceBounds = [0, 1000],
    onChange,
    onClear,
}) {
    const filterId = useId();
    const selectedCategories = filters.categories || [];
    const selectedBrands = filters.brands || [];
    const selectedAttributes = filters.attributes || [];
    const priceRange = filters.priceRange || priceBounds;

    const hasActiveFilters =
        selectedCategories.length > 0 ||
        selectedBrands.length > 0 ||
        selectedAttributes.length > 0 ||
        priceRange[0] !== priceBounds[0] ||
        priceRange[1] !== priceBounds[1] ||
        filters.inStockOnly;

    function toggleParent(parent, checked) {
        const family = new Set([
            parent.id,
            ...parent.children.map((child) => child.id),
        ]);

        const next = selectedCategories.filter(
            (slug) => !family.has(slug)
        );

        if (checked) next.push(parent.id);

        onChange({ categories: next });
    }

    function toggleChild(parent, child, checked) {
        let next = selectedCategories;

        if (next.includes(parent.id)) {
            next = [
                ...next.filter((slug) => slug !== parent.id),
                ...parent.children.map((item) => item.id),
            ];
        }

        next = checked
            ? [...new Set([...next, child.id])]
            : next.filter((slug) => slug !== child.id);

        onChange({ categories: next });
    }

    function toggleValue(values, value, checked) {
        return checked
            ? [...new Set([...values, value])]
            : values.filter((item) => item !== value);
    }

    function toggleAttribute(key, value, checked) {
        const current = selectedAttributes.find(
            (item) => item.key === key
        )?.values || [];

        const values = toggleValue(current, value, checked);

        const next = selectedAttributes.filter(
            (item) => item.key !== key
        );

        if (values.length) next.push({ key, values });

        onChange({ attributes: next });
    }

    return (
        <div className="product-filters">
            <div className="product-filters-header">
                <h2 className="product-filters-title">Filters</h2>

                <Button
                    size="small"
                    className="product-filters-clear"
                    disabled={!hasActiveFilters}
                    onClick={onClear}
                >
                    Clear all
                </Button>
            </div>

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

                {categories.map((parent) => {
                    const checked = selectedCategories.includes(parent.id);

                    const childCount = parent.children.filter(
                        (child) => selectedCategories.includes(child.id)
                    ).length;

                    return (
                        <details
                            key={`${parent.id}-${checked || childCount > 0}`}
                            className="border-bottom py-2"
                            open={checked || childCount > 0}
                        >
                            <summary className="product-filter-heading mb-1">
                                {parent.name}
                            </summary>

                            <FormControlLabel
                                className="product-filter-option"
                                label={
                                    <span className="product-filter-option-label">
                                        All {parent.name}
                                    </span>
                                }
                                control={
                                    <Checkbox
                                        size="small"
                                        className="product-filter-control"
                                        checked={checked}
                                        indeterminate={!checked && childCount > 0}
                                        onChange={(_, value) =>
                                            toggleParent(parent, value)
                                        }
                                    />
                                }
                            />

                            <div className="product-filter-options ps-3">
                                {parent.children.map((child) => (
                                    <FormControlLabel
                                        key={child.id}
                                        className="product-filter-option"
                                        label={
                                            <span className="product-filter-option-label">
                                                {child.name}
                                            </span>
                                        }
                                        control={
                                            <Checkbox
                                                size="small"
                                                className="product-filter-control"
                                                checked={
                                                    checked ||
                                                    selectedCategories.includes(child.id)
                                                }
                                                onChange={(_, value) =>
                                                    toggleChild(parent, child, value)
                                                }
                                            />
                                        }
                                    />
                                ))}
                            </div>
                        </details>
                    );
                })}

                {!categories.length && (
                    <p className="product-filter-note">
                        No categories available.
                    </p>
                )}
            </section>

            <section className="product-filter-group">
                <h3 className="product-filter-heading">Price range</h3>

                <div className="product-filter-price-values">
                    <span>{priceFormatter.format(priceRange[0])}</span>
                    <span>{priceFormatter.format(priceRange[1])}</span>
                </div>

                <div className="product-filter-slider">
                    <Slider
                        className="product-price-slider"
                        min={priceBounds[0]}
                        max={priceBounds[1]}
                        value={priceRange}
                        disableSwap
                        disabled={priceBounds[0] >= priceBounds[1]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={priceFormatter.format}
                        getAriaLabel={(index) =>
                            index === 0 ? "Minimum price" : "Maximum price"
                        }
                        getAriaValueText={priceFormatter.format}
                        onChange={(_, value) => {
                            if (Array.isArray(value)) {
                                onChange({ priceRange: value });
                            }
                        }}
                    />
                </div>
            </section>

            {brands.length > 0 && (
                <section className="product-filter-group">
                    <h3 className="product-filter-heading">Brand</h3>

                    <div className="product-filter-options">
                        {brands.map((brand) => (
                            <FormControlLabel
                                key={brand}
                                className="product-filter-option"
                                label={
                                    <span className="product-filter-option-label">
                                        {brand}
                                    </span>
                                }
                                control={
                                    <Checkbox
                                        size="small"
                                        className="product-filter-control"
                                        checked={selectedBrands.includes(brand)}
                                        onChange={(_, checked) =>
                                            onChange({
                                                brands: toggleValue(
                                                    selectedBrands,
                                                    brand,
                                                    checked
                                                ),
                                            })
                                        }
                                    />
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {attributes.map((attribute) => (
                <section
                    key={attribute.key}
                    className="product-filter-group"
                >
                    <h3 className="product-filter-heading">
                        {attribute.label}
                    </h3>

                    <div className="product-filter-options">
                        {attribute.values.map((value) => (
                            <FormControlLabel
                                key={value}
                                className="product-filter-option"
                                label={
                                    <span className="product-filter-option-label">
                                        {value}
                                    </span>
                                }
                                control={
                                    <Checkbox
                                        size="small"
                                        className="product-filter-control"
                                        checked={Boolean(
                                            selectedAttributes.find(
                                                (item) => item.key === attribute.key
                                            )?.values.includes(value)
                                        )}
                                        onChange={(_, checked) =>
                                            toggleAttribute(
                                                attribute.key,
                                                value,
                                                checked
                                            )
                                        }
                                    />
                                }
                            />
                        ))}
                    </div>
                </section>
            ))}

            <section className="product-filter-group">
                <h3 className="product-filter-heading">Availability</h3>

                <FormControlLabel
                    className="product-filter-option"
                    label="In stock only"
                    control={
                        <Checkbox
                            size="small"
                            className="product-filter-control"
                            checked={Boolean(filters.inStockOnly)}
                            onChange={(_, checked) =>
                                onChange({ inStockOnly: checked })
                            }
                        />
                    }
                />
            </section>
        </div>
    );
}

export default ProductFilters;