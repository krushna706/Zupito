import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Drawer,
    IconButton,
    MenuItem,
    Pagination,
    TextField,
    useMediaQuery,
} from "@mui/material";

import ProductCard from "../../components/ProductCard";
import ProductFilters from "./ProductFilters";
import { previewProducts } from "../Home/ProductSections";

// ================== CATALOG CONFIGURATION ==================
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
    { id: "travel-accessories", name: "Travel Accessories" },
];

const productCategories = {
    "preview-smartphone": "mobiles",
    "preview-laptop": "laptops",
    "preview-headphones": "headphones",
    "preview-shirt": "mens-wear",
    "preview-dress": "womens-wear",
    "preview-kids": "kids-wear",
    "preview-shoes": "footwear",
    "preview-watch": "watches",
    "preview-personal-care": "personal-care",
    "preview-pantry": "daily-essentials",
    "preview-snacks": "snacks-drinks",
    "preview-beauty": "beauty",
    "preview-kitchen": "home-kitchen",
    "preview-backpack": "backpacks",
    "preview-trolley": "trolley-bags",
    "preview-travel": "travel-accessories",
};

const categoryGroups = {
    electronics: ["mobiles", "laptops", "headphones"],
    fashion: [
        "mens-wear", "womens-wear", "kids-wear",
        "footwear", "watches", "backpacks",
    ],
    grocery: ["daily-essentials", "snacks-drinks"],
    travel: ["backpacks", "trolley-bags", "travel-accessories"],
};

const groupTitles = {
    electronics: "Electronics",
    fashion: "Fashion",
    grocery: "Groceries",
    travel: "Travel Essentials",
};

const collections = {
    featured: [
        "smartphone", "headphones", "shirt", "shoes",
        "watch", "backpack", "laptop", "kitchen",
    ],
    "daily-essentials": [
        "pantry", "personal-care", "snacks", "kitchen",
    ],
};

// Preview order only; backend will supply actual sales and approval dates.
const bestSellingOrder = [
    "headphones", "shoes", "watch", "smartphone",
    "backpack", "snacks", "shirt", "personal-care",
    "pantry", "dress", "laptop", "kitchen",
    "kids", "beauty", "trolley", "travel",
];

const newestOrder = [
    "laptop", "dress", "beauty", "trolley",
    "travel", "kids", "kitchen", "watch",
    "smartphone", "headphones", "shirt", "shoes",
    "backpack", "snacks", "personal-care", "pantry",
];

const sortOptions = [
    { value: "recommended", label: "Recommended" },
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "top-rated", label: "Top Rated" },
    { value: "best-selling", label: "Best Selling" },
];

const catalog = previewProducts.map((product) => ({
    ...product,
    category: productCategories[product._id],
}));

const priceBounds = [
    0,
    Math.max(1000, ...catalog.map((product) => product.price)),
];

const categoryIds = new Set(categories.map((category) => category.id));

const getOrder = (ids) => new Map(
    ids.map((id, index) => [`preview-${id}`, index])
);

const salesRanks = getOrder(bestSellingOrder);
const newestRanks = getOrder(newestOrder);

const readPrice = (value, fallback) => {
    if (value === null || value.trim() === "") return fallback;

    const price = Number(value);

    return Number.isFinite(price)
        ? Math.min(priceBounds[1], Math.max(priceBounds[0], price))
        : fallback;
};

// ================== PRODUCTS PAGE ==================
function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const desktopFilters = useMediaQuery("(min-width: 992px)");

    const query = (
        searchParams.get("search")
        || searchParams.get("q")
        || ""
    ).trim();

    const categoryParam = searchParams.get("category") || "";
    const requestedCategories = categoryParam.split(",").filter(Boolean);

    const selectedCategories = [
        ...new Set(
            requestedCategories.flatMap((id) => (
                categoryGroups[id] || (categoryIds.has(id) ? [id] : [])
            ))
        ),
    ];

    const hasUnknownCategory = requestedCategories.some(
        (id) => !categoryGroups[id] && !categoryIds.has(id)
    );

    const collection = searchParams.get("collection") || "";
    const collectionIds = collections[collection]?.map(
        (id) => `preview-${id}`
    );

    const requestedSort = searchParams.get("sort");
    const sort = sortOptions.some(
        (option) => option.value === requestedSort
    ) ? requestedSort : "recommended";

    const minimumPrice = readPrice(
        searchParams.get("minPrice"),
        priceBounds[0]
    );

    const maximumPrice = readPrice(
        searchParams.get("maxPrice"),
        priceBounds[1]
    );

    const requestedRating = Number(searchParams.get("rating"));
    const minimumRating = [2, 3, 4].includes(requestedRating)
        ? requestedRating
        : 0;

    const filters = {
        categories: selectedCategories,
        priceRange: [
            Math.min(minimumPrice, maximumPrice),
            Math.max(minimumPrice, maximumPrice),
        ],
        minRating: minimumRating,
        inStockOnly: searchParams.get("inStock") === "true",
    };

    // Keep category counts independent of the selected sidebar filters.
    const scopedProducts = catalog.filter((product) => {
        if (collection && !collectionIds) return false;

        if (collectionIds && !collectionIds.includes(product._id)) {
            return false;
        }

        if (!query) return true;

        const categoryName = categories.find(
            (category) => category.id === product.category
        )?.name || "";

        const searchableText = [
            product.name,
            categoryName,
            product.packLabel,
            product.variantLabel,
        ].filter(Boolean).join(" ").toLowerCase();

        return query.toLowerCase().split(/\s+/).every(
            (word) => searchableText.includes(word)
        );
    });

    const filterCategories = categories.map((category) => ({
        ...category,
        count: scopedProducts.filter(
            (product) => product.category === category.id
        ).length,
    }));

    const filteredProducts = scopedProducts.filter((product) => {
        if (hasUnknownCategory) return false;

        if (
            selectedCategories.length > 0
            && !selectedCategories.includes(product.category)
        ) {
            return false;
        }

        if (
            product.price < filters.priceRange[0]
            || product.price > filters.priceRange[1]
        ) {
            return false;
        }

        if (
            minimumRating > 0
            && (
                !Number.isFinite(product.rating)
                || product.rating < minimumRating
                || !(product.ratingCount > 0)
            )
        ) {
            return false;
        }

        return !filters.inStockOnly || product.stock > 0;
    });

    const sortedProducts = [...filteredProducts].sort((first, second) => {
        switch (sort) {
            case "price-asc":
                return first.price - second.price;

            case "price-desc":
                return second.price - first.price;

            case "top-rated":
                return (
                    (second.rating || 0) - (first.rating || 0)
                    || (second.ratingCount || 0) - (first.ratingCount || 0)
                );

            case "best-selling":
                return (
                    (salesRanks.get(first._id) ?? Infinity)
                    - (salesRanks.get(second._id) ?? Infinity)
                );

            case "newest":
                return (
                    (newestRanks.get(first._id) ?? Infinity)
                    - (newestRanks.get(second._id) ?? Infinity)
                );

            default:
                return 0;
        }
    });

    const totalPages = Math.max(
        1,
        Math.ceil(sortedProducts.length / PAGE_SIZE)
    );

    const requestedPage = Number(searchParams.get("page"));

    const currentPage = Number.isInteger(requestedPage)
        && requestedPage > 0
        ? Math.min(requestedPage, totalPages)
        : 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visibleProducts = sortedProducts.slice(
        startIndex,
        startIndex + PAGE_SIZE
    );

    const activeFilterCount =
        selectedCategories.length
        + Number(
            filters.priceRange[0] !== priceBounds[0]
            || filters.priceRange[1] !== priceBounds[1]
        )
        + Number(minimumRating > 0)
        + Number(filters.inStockOnly);

    let pageTitle = "All Products";

    if (query) {
        pageTitle = `Results for “${query}”`;
    } else if (groupTitles[categoryParam]) {
        pageTitle = groupTitles[categoryParam];
    } else if (selectedCategories.length === 1) {
        pageTitle = categories.find(
            (category) => category.id === selectedCategories[0]
        )?.name || pageTitle;
    } else if (collection === "featured") {
        pageTitle = "Featured Products";
    } else if (collection === "daily-essentials") {
        pageTitle = "Daily Essentials";
    } else if (sort === "best-selling") {
        pageTitle = "Top Selling";
    } else if (sort === "newest") {
        pageTitle = "New Arrivals";
    }

    const updateFilters = (changes) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            if (changes.categories !== undefined) {
                if (changes.categories.length > 0) {
                    next.set("category", changes.categories.join(","));
                } else {
                    next.delete("category");
                }
            }

            if (changes.priceRange !== undefined) {
                const [min, max] = changes.priceRange;

                if (min === priceBounds[0]) next.delete("minPrice");
                else next.set("minPrice", String(min));

                if (max === priceBounds[1]) next.delete("maxPrice");
                else next.set("maxPrice", String(max));
            }

            if (changes.minRating !== undefined) {
                if (changes.minRating > 0) {
                    next.set("rating", String(changes.minRating));
                } else {
                    next.delete("rating");
                }
            }

            if (changes.inStockOnly !== undefined) {
                if (changes.inStockOnly) next.set("inStock", "true");
                else next.delete("inStock");
            }

            next.delete("page");
            return next;
        }, { replace: true });
    };

    const clearFilters = () => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            [
                "category", "minPrice", "maxPrice",
                "rating", "inStock", "page",
            ].forEach((key) => next.delete(key));

            return next;
        }, { replace: true });
    };

    const changeSort = (event) => {
        const value = event.target.value;

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

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
                    <i
                        className="fa-solid fa-chevron-right"
                        aria-hidden="true"
                    />
                    <span aria-current="page">Products</span>
                </nav>

                <div className="products-page-header">
                    <div className="products-page-heading">
                        <h1>{pageTitle}</h1>

                        <p aria-live="polite" aria-atomic="true">
                            {sortedProducts.length === 0
                                ? "No products found"
                                : `Showing ${startIndex + 1}–${
                                    startIndex + visibleProducts.length
                                } of ${sortedProducts.length} products`}
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
                                <i
                                    className="fa-solid fa-sliders"
                                    aria-hidden="true"
                                />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span>{activeFilterCount}</span>
                                )}
                            </button>
                        )}

                        <TextField
                            select
                            size="small"
                            label="Sort by"
                            value={sort}
                            onChange={changeSort}
                            className="products-sort"
                            sx={{
                                minWidth: 180,
                                "& .MuiOutlinedInput-root": {
                                    fontFamily: "inherit",
                                    fontSize: "0.875rem",
                                    borderRadius: "10px",
                                    backgroundColor: "#ffffff",
                                },
                                "& .MuiInputLabel-root": {
                                    fontFamily: "inherit",
                                },
                                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                    borderColor: "var(--color-accent)",
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "var(--color-primary)",
                                },
                            }}
                        >
                            {sortOptions.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                    sx={{
                                        fontFamily: "inherit",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </div>
                </div>

                <div className="products-layout">
                    {desktopFilters && (
                        <aside
                            className="products-sidebar"
                            aria-label="Product filters"
                        >
                            {filterContent}
                        </aside>
                    )}

                    <div className="products-results">
                        {visibleProducts.length > 0 ? (
                            <>
                                <ul className="products-grid">
                                    {visibleProducts.map((product) => (
                                        <li key={product._id}>
                                            <ProductCard product={product} />
                                        </li>
                                    ))}
                                </ul>

                                {totalPages > 1 && (
                                    <div className="products-pagination">
                                        <Pagination
                                            count={totalPages}
                                            page={currentPage}
                                            onChange={changePage}
                                            shape="rounded"
                                            siblingCount={0}
                                            sx={{
                                                "& .MuiPaginationItem-root": {
                                                    fontFamily: "inherit",
                                                    color: "var(--color-primary)",
                                                },
                                                "& .MuiPaginationItem-root.Mui-selected": {
                                                    backgroundColor:
                                                        "var(--color-accent-soft)",
                                                    border: "1px solid var(--color-accent)",
                                                    "&:hover": {
                                                        backgroundColor: "#ffe0c6",
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="products-empty">
                                <i
                                    className="fa-solid fa-magnifying-glass"
                                    aria-hidden="true"
                                />
                                <h2>No products found</h2>
                                <p>
                                    Try another search or adjust your filters.
                                </p>

                                <div className="products-empty-actions">
                                    {(activeFilterCount > 0
                                        || hasUnknownCategory) && (
                                        <button
                                            type="button"
                                            className="products-filter-button"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </button>
                                    )}

                                    <Link
                                        to="/products"
                                        className="home-categories-view-all"
                                    >
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
                            role: "dialog",
                            "aria-modal": true,
                            "aria-label": "Product filters",
                            sx: {
                                width: "min(340px, 90vw)",
                                padding: "16px",
                            },
                        },
                    }}
                >
                    <div className="products-drawer-header">
                        <span>Refine products</span>

                        <IconButton
                            aria-label="Close filters"
                            onClick={() => setDrawerOpen(false)}
                        >
                            <i
                                className="fa-solid fa-xmark"
                                aria-hidden="true"
                            />
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