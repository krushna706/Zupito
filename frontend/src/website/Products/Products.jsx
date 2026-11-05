import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Drawer, IconButton, MenuItem, Pagination, TextField, useMediaQuery } from "@mui/material";

import ProductCard from "../../components/ProductCard";
import ProductFilters from "./ProductFilters";
import { productCatalog } from "../../data/productCatalog";
import {
    getAvailableStock,
    getDisplayVariant,
    getProductView,
    hasProductVariants
} from "../../utils/productVariants";

const PAGE_SIZE = 30;

const categories = [
    { id: "mobiles", name: "Mobiles" },
    { id: "laptops", name: "Laptops" },
    { id: "headphones", name: "Headphones" },
    { id: "mens-wear", name: "Men's Wear" },
    { id: "womens-wear", name: "Women's Wear" },
    { id: "kids-wear", name: "Kids' Wear" },
    { id: "footwear", name: "Footwear" },
    { id: "watches", name: "Watches" },
    { id: "personal-care", name: "Personal Care" },
    { id: "daily-essentials", name: "Daily Essentials" },
    { id: "snacks-drinks", name: "Snacks & Drinks" },
    { id: "beauty", name: "Beauty" },
    { id: "home-kitchen", name: "Home & Kitchen" },
    { id: "backpacks", name: "Backpacks" },
    { id: "trolley-bags", name: "Trolley Bags" },
    { id: "travel-accessories", name: "Travel Accessories" }
];

const categoryGroups = {
    electronics: ["mobiles", "laptops", "headphones"],
    fashion: ["mens-wear", "womens-wear", "kids-wear", "footwear", "watches", "backpacks"],
    grocery: ["daily-essentials", "snacks-drinks"],
    travel: ["backpacks", "trolley-bags", "travel-accessories"]
};

const groupTitles = {
    electronics: "Electronics",
    fashion: "Fashion",
    grocery: "Groceries",
    travel: "Travel Essentials"
};

const collections = {
    featured: ["smartphone", "headphones", "shirt", "shoes", "watch", "backpack", "laptop", "kitchen"],
    "daily-essentials": ["pantry", "personal-care", "snacks", "kitchen"]
};

const bestSellingOrder = [
    "headphones",
    "shoes",
    "watch",
    "smartphone",
    "backpack",
    "snacks",
    "shirt",
    "personal-care",
    "pantry",
    "dress",
    "laptop",
    "kitchen",
    "kids",
    "beauty",
    "trolley",
    "travel"
];

const newestOrder = [
    "laptop",
    "dress",
    "beauty",
    "trolley",
    "travel",
    "kids",
    "kitchen",
    "watch",
    "smartphone",
    "headphones",
    "shirt",
    "shoes",
    "backpack",
    "snacks",
    "personal-care",
    "pantry"
];

const sortOptions = [
    { value: "recommended", label: "Recommended" },
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "top-rated", label: "Top Rated" },
    { value: "best-selling", label: "Best Selling" }
];

const catalog = productCatalog;
const categoryIds = new Set(categories.map((item) => item.id));

const catalogPrices = catalog
    .flatMap((product) =>
        hasProductVariants(product) ? product.variants.map((variant) => variant.price) : [product.price]
    )
    .filter(Number.isFinite);

const priceBounds = [0, Math.max(1000, ...catalogPrices)];

const getRanks = (items) => new Map(items.map((id, index) => [`preview-${id}`, index]));

const salesRanks = getRanks(bestSellingOrder);
const newestRanks = getRanks(newestOrder);

const readPrice = (value, fallback) => {
    if (value === null || value.trim() === "") return fallback;

    const price = Number(value);

    return Number.isFinite(price) ? Math.min(priceBounds[1], Math.max(priceBounds[0], price)) : fallback;
};

const matchesSearch = (product, variant, words) => {
    if (!words.length) return true;

    const view = getProductView(product, variant);
    if (!view) return false;

    const text = [
        product.name,
        product.brand,
        categories.find((item) => item.id === product.category)?.name,
        groupTitles[product.group],
        view.variantLabel,
        view.packLabel,
        ...Object.values(view.selectedOptions)
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return words.every((word) => text.includes(word));
};

const selectVariant = (product, candidates, sort) => {
    if (!hasProductVariants(product)) return null;

    if (sort !== "price-asc" && sort !== "price-desc") {
        return getDisplayVariant(product, { candidates });
    }

    const available = candidates.filter((variant) => getAvailableStock(variant) > 0);

    const pool = available.length ? available : candidates;
    const direction = sort === "price-asc" ? 1 : -1;

    return [...pool].sort((first, second) => direction * (first.price - second.price))[0] ?? null;
};

function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const desktopFilters = useMediaQuery("(min-width:992px)");

    const query = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const categoryParam = searchParams.get("category") || "";

    const requestedCategories = categoryParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    const selectedCategories = [
        ...new Set(
            requestedCategories.flatMap((id) => categoryGroups[id] || (categoryIds.has(id) ? [id] : []))
        )
    ];

    const hasUnknownCategory = requestedCategories.some((id) => !categoryGroups[id] && !categoryIds.has(id));

    const collection = searchParams.get("collection") || "";
    const collectionIds = collections[collection]?.map((id) => `preview-${id}`);

    const requestedSort = searchParams.get("sort");
    const sort = sortOptions.some((item) => item.value === requestedSort) ? requestedSort : "recommended";

    const minPrice = readPrice(searchParams.get("minPrice"), priceBounds[0]);
    const maxPrice = readPrice(searchParams.get("maxPrice"), priceBounds[1]);
    const requestedRating = Number(searchParams.get("rating"));
    const minRating = [2, 3, 4].includes(requestedRating) ? requestedRating : 0;

    const filters = {
        categories: selectedCategories,
        priceRange: [Math.min(minPrice, maxPrice), Math.max(minPrice, maxPrice)],
        minRating,
        inStockOnly: searchParams.get("inStock") === "true"
    };

    // Search each product against its own matching variants.
    const scopedProducts = catalog.flatMap((product) => {
        if (collection && !collectionIds) return [];
        if (collectionIds && !collectionIds.includes(product._id)) return [];

        const variants = hasProductVariants(product) ? product.variants : [null];
        const candidates = variants.filter((variant) => matchesSearch(product, variant, words));

        return candidates.length ? [{ product, candidates }] : [];
    });

    const filterCategories = categories.map((category) => ({
        ...category,
        count: scopedProducts.filter(({ product }) => product.category === category.id).length
    }));

    const filteredProducts = scopedProducts.flatMap(({ product, candidates }) => {
        if (hasUnknownCategory) return [];

        if (selectedCategories.length && !selectedCategories.includes(product.category)) {
            return [];
        }

        if (
            minRating > 0 &&
            (!Number.isFinite(product.rating) || product.rating < minRating || !(product.ratingCount > 0))
        )
            return [];

        const eligible = candidates.filter((variant) => {
            const view = getProductView(product, variant);

            return (
                view &&
                Number.isFinite(view.price) &&
                view.price >= filters.priceRange[0] &&
                view.price <= filters.priceRange[1] &&
                (!filters.inStockOnly || view.stock > 0)
            );
        });

        if (!eligible.length) return [];

        const variant = selectVariant(product, eligible, sort);
        const view = getProductView(product, variant);

        return view ? [{ product, view }] : [];
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sort) {
            case "price-asc":
                return a.view.price - b.view.price;
            case "price-desc":
                return b.view.price - a.view.price;
            case "top-rated":
                return (
                    (b.view.rating || 0) - (a.view.rating || 0) ||
                    (b.view.ratingCount || 0) - (a.view.ratingCount || 0)
                );
            case "best-selling":
                return (
                    (salesRanks.get(a.product._id) ?? Infinity) - (salesRanks.get(b.product._id) ?? Infinity)
                );
            case "newest":
                return (
                    (newestRanks.get(a.product._id) ?? Infinity) -
                    (newestRanks.get(b.product._id) ?? Infinity)
                );
            default:
                return 0;
        }
    });

    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
    const requestedPage = Number(searchParams.get("page"));
    const currentPage =
        Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visibleProducts = sortedProducts.slice(startIndex, startIndex + PAGE_SIZE);

    const activeFilterCount =
        selectedCategories.length +
        Number(filters.priceRange[0] !== priceBounds[0] || filters.priceRange[1] !== priceBounds[1]) +
        Number(minRating > 0) +
        Number(filters.inStockOnly);

    let pageTitle = "All Products";

    if (query) pageTitle = `Results for “${query}”`;
    else if (groupTitles[categoryParam]) pageTitle = groupTitles[categoryParam];
    else if (selectedCategories.length === 1) {
        pageTitle = categories.find((category) => category.id === selectedCategories[0])?.name || pageTitle;
    } else if (collection === "featured") pageTitle = "Featured Products";
    else if (collection === "daily-essentials") pageTitle = "Daily Essentials";
    else if (sort === "best-selling") pageTitle = "Top Selling";
    else if (sort === "newest") pageTitle = "New Arrivals";

    const updateFilters = (changes) => {
        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous);

                const update = (key, value) => {
                    if (value === null || value === "") next.delete(key);
                    else next.set(key, String(value));
                };

                if (changes.categories !== undefined) {
                    update("category", changes.categories.join(","));
                }

                if (changes.priceRange !== undefined) {
                    const [min, max] = changes.priceRange;
                    update("minPrice", min === priceBounds[0] ? null : min);
                    update("maxPrice", max === priceBounds[1] ? null : max);
                }

                if (changes.minRating !== undefined) {
                    update("rating", changes.minRating || null);
                }

                if (changes.inStockOnly !== undefined) {
                    update("inStock", changes.inStockOnly ? "true" : null);
                }

                next.delete("page");
                return next;
            },
            { replace: true }
        );
    };

    const clearFilters = () => {
        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous);

                ["category", "minPrice", "maxPrice", "rating", "inStock", "page"].forEach((key) =>
                    next.delete(key)
                );

                return next;
            },
            { replace: true }
        );
    };

    const changeSort = (event) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            const value = event.target.value;

            if (value === "recommended") next.delete("sort");
            else next.set("sort", value);

            next.delete("page");
            return next;
        });
    };

    const changePage = (_, page) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            if (page === 1) next.delete("page");
            else next.set("page", String(page));

            return next;
        });

        window.scrollTo({ top: 0, behavior: "instant" });
    };

    const filterContent = (
        <ProductFilters
            categories={filterCategories}
            filters={filters}
            priceBounds={priceBounds}
            onChange={updateFilters}
            onClear={clearFilters}
        />
    );

    return (
        <section className="products-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Products</span>
                </nav>

                <div className="products-page-header">
                    <div className="products-page-heading">
                        <h1>{pageTitle}</h1>
                        <p aria-live="polite" aria-atomic="true">
                            {sortedProducts.length === 0
                                ? "No products found"
                                : `Showing ${startIndex + 1}–${startIndex + visibleProducts.length} of ${sortedProducts.length} products`}
                        </p>
                    </div>

                    <div className="products-toolbar">
                        {!desktopFilters && (
                            <button
                                type="button"
                                className="products-filter-button"
                                onClick={() => setDrawerOpen(true)}
                                aria-haspopup="dialog"
                                aria-expanded={drawerOpen}
                            >
                                <i className="fa-solid fa-sliders" aria-hidden="true" />
                                Filters
                                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                            </button>
                        )}

                        <TextField
                            select
                            size="small"
                            label="Sort by"
                            value={sort}
                            onChange={changeSort}
                            className="products-sort"
                        >
                            {sortOptions.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                    className="products-sort-option"
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </div>
                </div>

                <div className="products-layout">
                    {desktopFilters && (
                        <aside className="products-sidebar" aria-label="Product filters">
                            {filterContent}
                        </aside>
                    )}

                    <div className="products-results">
                        {visibleProducts.length > 0 ? (
                            <>
                                <ul className="products-grid">
                                    {visibleProducts.map(({ product, view }) => (
                                        <li key={product._id}>
                                            <ProductCard product={product} variantId={view.variantId} />
                                        </li>
                                    ))}
                                </ul>

                                {totalPages > 1 && (
                                    <div className="products-pagination">
                                        <Pagination
                                            className="products-pagination-control"
                                            count={totalPages}
                                            page={currentPage}
                                            onChange={changePage}
                                            shape="rounded"
                                            siblingCount={0}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="products-empty">
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                                <h2>No products found</h2>
                                <p>Try another search or adjust your filters.</p>

                                <div className="products-empty-actions">
                                    {(activeFilterCount > 0 || hasUnknownCategory) && (
                                        <button
                                            type="button"
                                            className="products-filter-button"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </button>
                                    )}

                                    <Link to="/products" className="home-categories-view-all">
                                        Browse All Products
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!desktopFilters && (
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    slotProps={{
                        paper: {
                            className: "products-drawer-paper",
                            role: "dialog",
                            "aria-modal": true,
                            "aria-label": "Product filters"
                        }
                    }}
                >
                    <div className="products-drawer-header">
                        <span>Refine products</span>
                        <IconButton aria-label="Close filters" onClick={() => setDrawerOpen(false)}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </IconButton>
                    </div>

                    {filterContent}

                    <button
                        type="button"
                        className="products-drawer-apply"
                        onClick={() => setDrawerOpen(false)}
                    >
                        Show {sortedProducts.length} products
                    </button>
                </Drawer>
            )}
        </section>
    );
}

export default Products;
