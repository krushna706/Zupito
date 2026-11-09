import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Alert,
    Button,
    Drawer,
    IconButton,
    MenuItem,
    Pagination,
    TextField,
    useMediaQuery,
} from "@mui/material";

import ProductCard from "../../components/ProductCard";
import ProductFilters from "./ProductFilters";
import { getPublicProducts } from "../../services/productService";

const PAGE_SIZE = 30;

const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
];

const initialData = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    priceBounds: [0, 1000],
    total: 0,
    pages: 1,
};

function readPrice(value) {
    if (value === null || value.trim() === "") return undefined;

    const number = Number(value);

    return Number.isFinite(number) &&
        number >= 0 &&
        number <= 10000000
        ? Math.round(number * 100)
        : undefined;
}

function readSelections(value) {
    try {
        const parsed = JSON.parse(value || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const desktopFilters = useMediaQuery("(min-width:992px)");
    const queryString = searchParams.toString();

    const search = (
        searchParams.get("search") ||
        searchParams.get("q") ||
        ""
    ).trim();

    const category = searchParams.get("category") || "";
    const requestedSort = searchParams.get("sort");

    const sort = sortOptions.some((item) => item.value === requestedSort)
        ? requestedSort
        : "newest";

    const requestedPage = Number(searchParams.get("page"));

    const currentPage = Number.isInteger(requestedPage) &&
        requestedPage > 0 &&
        requestedPage <= 100000
        ? requestedPage
        : 1;

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        const timer = setTimeout(async () => {
            const params = new URLSearchParams(queryString);
            const pageValue = Number(params.get("page"));
            const sortValue = params.get("sort");

            try {
                const result = await getPublicProducts({
                    search: (
                        params.get("search") ||
                        params.get("q") ||
                        ""
                    ).trim(),

                    category: params.get("category") || "",
                    brands: params.get("brands") || "[]",
                    attributes: params.get("attributes") || "[]",

                    sort: sortOptions.some((item) => item.value === sortValue)
                        ? sortValue
                        : "newest",

                    minPricePaise: readPrice(params.get("minPrice")),
                    maxPricePaise: readPrice(params.get("maxPrice")),
                    inStock: params.get("inStock") === "true",

                    page: Number.isInteger(pageValue) &&
                        pageValue > 0 &&
                        pageValue <= 100000
                        ? pageValue
                        : 1,

                    limit: PAGE_SIZE,
                });

                if (!active) return;

                setData(result);

                if (result.page > result.pages) {
                    setSearchParams((previous) => {
                        const next = new URLSearchParams(previous);
                        next.set("page", String(result.pages));
                        return next;
                    }, { replace: true });
                }
            } catch (requestError) {
                if (!active) return;

                setData(initialData);

                setError(
                    requestError.message ||
                    "Unable to load products. Please try again."
                );
            } finally {
                if (active) setLoading(false);
            }
        }, 250);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [queryString, reload, setSearchParams]);

    const selectedSlugs = category.split(",").filter(Boolean);
    const minPrice = readPrice(searchParams.get("minPrice"));
    const maxPrice = readPrice(searchParams.get("maxPrice"));
    const maximum = data.priceBounds[1];

    const priceRange = [
        Math.min(maximum, (minPrice ?? 0) / 100),
        Math.min(maximum, (maxPrice ?? maximum * 100) / 100),
    ].sort((first, second) => first - second);

    const filters = {
        categories: selectedSlugs,

        brands: readSelections(searchParams.get("brands"))
            .filter((item) => typeof item === "string"),

        attributes: readSelections(searchParams.get("attributes"))
            .filter((item) =>
                item &&
                typeof item.key === "string" &&
                Array.isArray(item.values)
            ),

        priceRange,
        inStockOnly: searchParams.get("inStock") === "true",
    };

    const activeFilterCount =
        selectedSlugs.length +
        Number(minPrice !== undefined || maxPrice !== undefined) +
        Number(filters.inStockOnly) +
        filters.brands.length +
        filters.attributes.length;

    const selectedCategory = data.categories
        .flatMap((parent) => [parent, ...parent.children])
        .find((item) => item.id === category);

    const pageTitle = search
        ? `Results for “${search}”`
        : selectedCategory
            ? selectedCategory.name
            : "All Products";

    const startIndex = (currentPage - 1) * PAGE_SIZE;

    function updateParams(values, resetPage = true) {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);

            for (const [key, value] of Object.entries(values)) {
                if (value === null || value === "") {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            }

            if (resetPage) next.delete("page");

            return next;
        }, { replace: true });
    }

    function updateFilters(changes) {
        const values = {};

        if (changes.categories !== undefined) {
            values.category = changes.categories.join(",");
            values.brands = null;
            values.attributes = null;
            values.minPrice = null;
            values.maxPrice = null;
        }

        if (changes.brands !== undefined) {
            values.brands = changes.brands.length
                ? JSON.stringify(changes.brands)
                : null;
        }

        if (changes.attributes !== undefined) {
            values.attributes = changes.attributes.length
                ? JSON.stringify(changes.attributes)
                : null;
        }

        if (changes.priceRange !== undefined) {
            const [min, max] = changes.priceRange;

            values.minPrice = min === 0 ? null : min;
            values.maxPrice = max === maximum ? null : max;
        }

        if (changes.inStockOnly !== undefined) {
            values.inStock = changes.inStockOnly ? "true" : null;
        }

        updateParams(values);
    }

    function clearFilters() {
        updateParams({
            category: null,
            brands: null,
            attributes: null,
            minPrice: null,
            maxPrice: null,
            inStock: null,
            rating: null,
            collection: null,
        });
    }

    function changePage(_, page) {
        updateParams({ page: page === 1 ? null : page }, false);
        window.scrollTo({ top: 0, behavior: "instant" });
    }

    const filterContent = (
        <ProductFilters
            categories={data.categories}
            brands={data.brands}
            attributes={data.attributes}
            filters={filters}
            priceBounds={data.priceBounds}
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

                        <p aria-live="polite">
                            {loading
                                ? "Loading products..."
                                : error
                                    ? "Products could not be loaded"
                                    : data.total === 0
                                        ? "No products found"
                                        : `Showing ${startIndex + 1}–${startIndex + data.products.length} of ${data.total} products`}
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
                            onChange={(event) =>
                                updateParams({ sort: event.target.value })
                            }
                            className="products-sort"
                        >
                            {sortOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
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
                        {loading ? (
                            <div className="products-empty" role="status">
                                <h2>Loading products...</h2>
                            </div>
                        ) : error ? (
                            <Alert
                                severity="error"
                                action={
                                    <Button
                                        color="inherit"
                                        onClick={() =>
                                            setReload((value) => value + 1)
                                        }
                                    >
                                        Retry
                                    </Button>
                                }
                            >
                                {error}
                                {activeFilterCount > 0 && (
                                    <Button color="inherit" onClick={clearFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                            </Alert>
                        ) : data.products.length > 0 ? (
                            <>
                                <ul className="products-grid">
                                    {data.products.map((product) => (
                                        <li key={product._id}>
                                            <ProductCard
                                                product={product}
                                                variantId={product.variantId}
                                            />
                                        </li>
                                    ))}
                                </ul>

                                {data.pages > 1 && (
                                    <div className="products-pagination">
                                        <Pagination
                                            className="products-pagination-control"
                                            count={data.pages}
                                            page={Math.min(currentPage, data.pages)}
                                            onChange={changePage}
                                            shape="rounded"
                                            siblingCount={0}
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
                                <p>Try another search or adjust your filters.</p>

                                <div className="products-empty-actions">
                                    {activeFilterCount > 0 && (
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
                                "aria-label": "Product filters",
                            },
                        }}
                    >
                        <div className="products-drawer-header">
                            <span>Refine products</span>

                            <IconButton
                                aria-label="Close filters"
                                onClick={() => setDrawerOpen(false)}
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </IconButton>
                        </div>

                        {filterContent}

                        <button
                            type="button"
                            className="products-drawer-apply"
                            onClick={() => setDrawerOpen(false)}
                        >
                            {loading
                                ? "Loading..."
                                : `Show ${data.total} products`}
                        </button>
                    </Drawer>
                )}
            </div>
        </section>
    );
}

export default Products;