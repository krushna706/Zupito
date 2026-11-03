import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../../components/ProductCard";

// ================== PREVIEW CATALOG ==================
// Demo values; replace with approved product API data.
export const previewProducts = [
    {
        _id: "preview-smartphone",
        name: "Everyday Smartphone",
        image: "/images/categories/mobiles.webp",
        price: 14999,
        mrp: 17999,
        stock: 12,
        rating: 4.5,
        ratingCount: 250,
        variantLabel: "128 GB",
    },
    {
        _id: "preview-laptop",
        name: "Everyday Performance Laptop",
        image: "/images/categories/laptops.webp",
        price: 42999,
        mrp: 47999,
        stock: 8,
        rating: 4.6,
        ratingCount: 118,
        variantLabel: "8 GB RAM · 512 GB SSD",
    },
    {
        _id: "preview-headphones",
        name: "Over-Ear Headphones",
        image: "/images/categories/headphones.jpg",
        price: 1999,
        mrp: 2499,
        stock: 20,
        rating: 4.3,
        ratingCount: 326,
        variantLabel: "Black",
    },
    {
        _id: "preview-shirt",
        name: "Men's Casual Shirt",
        image: "/images/categories/mens-wear.webp",
        price: 899,
        mrp: 1299,
        stock: 18,
        rating: 4.2,
        ratingCount: 164,
        variantLabel: "Navy · M",
    },
    {
        _id: "preview-dress",
        name: "Women's Everyday Dress",
        image: "/images/categories/womens-wear.webp",
        price: 1299,
        mrp: 1799,
        stock: 16,
        rating: 4.5,
        ratingCount: 207,
        variantLabel: "Navy · M",
    },
    {
        _id: "preview-kids",
        name: "Kids' Casual Outfit",
        image: "/images/categories/kids-wear.webp",
        price: 699,
        mrp: 999,
        stock: 14,
        rating: 4.4,
        ratingCount: 92,
        variantLabel: "Pink · 3–4 years",
    },
    {
        _id: "preview-shoes",
        name: "Everyday Casual Sneakers",
        image: "/images/categories/footwear.webp",
        price: 1499,
        mrp: 1999,
        stock: 15,
        rating: 4.3,
        ratingCount: 284,
        variantLabel: "White · UK 8",
    },
    {
        _id: "preview-watch",
        name: "Classic Everyday Watch",
        image: "/images/categories/watches.webp",
        price: 1299,
        mrp: 1799,
        stock: 10,
        rating: 4.5,
        ratingCount: 186,
        variantLabel: "Black",
    },
    {
        _id: "preview-personal-care",
        name: "Daily Personal Care Kit",
        image: "/images/categories/personal-care.webp",
        price: 449,
        mrp: 599,
        stock: 24,
        rating: 4.4,
        ratingCount: 143,
        packLabel: "Pack of 3",
    },
    {
        _id: "preview-pantry",
        name: "Kitchen Pantry Essentials",
        image: "/images/categories/daily-essentials.webp",
        price: 799,
        mrp: 949,
        stock: 22,
        rating: 4.6,
        ratingCount: 218,
        packLabel: "Combo · 3 items",
    },
    {
        _id: "preview-snacks",
        name: "Everyday Snack Selection",
        image: "/images/categories/snacks-drinks.webp",
        price: 249,
        mrp: 299,
        stock: 30,
        rating: 4.2,
        ratingCount: 375,
        packLabel: "500 g",
    },
    {
        _id: "preview-beauty",
        name: "Everyday Makeup Essentials",
        image: "/images/categories/beauty.webp",
        price: 899,
        mrp: 1199,
        stock: 17,
        rating: 4.3,
        ratingCount: 109,
        packLabel: "Pack of 3",
    },
    {
        _id: "preview-kitchen",
        name: "Everyday Dining Set",
        image: "/images/categories/home-kitchen.webp",
        price: 1199,
        mrp: 1599,
        stock: 12,
        rating: 4.5,
        ratingCount: 87,
        packLabel: "6 pieces",
    },
    {
        _id: "preview-backpack",
        name: "Travel and Everyday Backpack",
        image: "/images/categories/backpacks.jpg",
        price: 1199,
        mrp: 1599,
        stock: 14,
        rating: 4.4,
        ratingCount: 231,
        variantLabel: "Black · 30 L",
    },
    {
        _id: "preview-trolley",
        name: "Cabin Trolley Bag",
        image: "/images/categories/trolley-bags.jpg",
        price: 2499,
        mrp: 3299,
        stock: 9,
        rating: 4.6,
        ratingCount: 76,
        variantLabel: "Cabin size · 55 cm",
    },
    {
        _id: "preview-travel",
        name: "Travel Accessories Kit",
        image: "/images/categories/travel-accessories.jpg",
        price: 599,
        mrp: 799,
        stock: 18,
        rating: 0,
        ratingCount: 0,
        packLabel: "Pack of 4",
    },
];

const previewProductMap = new Map(
    previewProducts.map((product) => [product._id, product])
);

const selectPreviewProducts = (...ids) => (
    ids.map((id) => previewProductMap.get(`preview-${id}`)).filter(Boolean)
);

// ================== SECTION CONFIGURATION ==================
// Add another configuration object to introduce a new section.
const previewSections = [
    {
        key: "featured",
        title: "Featured Products",
        viewAllPath: "/products?collection=featured",
        products: selectPreviewProducts(
            "smartphone", "headphones", "shirt", "shoes",
            "watch", "backpack", "laptop", "kitchen"
        ),
    },
    {
        key: "top-selling",
        title: "Top Selling",
        viewAllPath: "/products?sort=best-selling",
        products: selectPreviewProducts(
            "headphones", "shoes", "watch", "smartphone",
            "backpack", "snacks", "shirt", "personal-care"
        ),
    },
    {
        key: "fashion",
        title: "Fashion Picks",
        viewAllPath: "/products?category=fashion",
        products: selectPreviewProducts(
            "shirt", "dress", "kids", "shoes", "watch", "backpack"
        ),
    },
    {
        key: "daily-essentials",
        title: "Daily Essentials",
        viewAllPath: "/products?collection=daily-essentials",
        products: selectPreviewProducts(
            "pantry", "personal-care", "snacks", "kitchen"
        ),
    },
    {
        key: "new-arrivals",
        title: "New Arrivals",
        viewAllPath: "/products?sort=newest",
        products: selectPreviewProducts(
            "laptop", "dress", "beauty", "trolley",
            "travel", "kids", "kitchen", "watch"
        ),
    },
];

// ================== CAROUSEL SETTINGS ==================
const MIN_LOOP_ITEMS = 12;
const AUTO_SCROLL_SPEED = 24;
const INTERACTION_DELAY = 1500;

// ================== PRODUCT ROW ==================
function ProductRow({ section }) {
    const trackRef = useRef(null);
    const draggingRef = useRef(null);
    const suppressClickRef = useRef(false);
    const hoveredRef = useRef(false);
    const focusedRef = useRef(false);
    const touchingRef = useRef(false);
    const lastInteractionRef = useRef(0);

    const products = section.products;
    const titleId = `product-section-${section.key}-title`;

    const repeatCount = Math.max(
        1,
        Math.ceil(MIN_LOOP_ITEMS / Math.max(products.length, 1))
    );

    const loopProducts = Array.from(
        { length: repeatCount },
        () => products
    ).flat();

    // Three matching sets allow invisible wrapping in either direction.
    useEffect(() => {
        const track = trackRef.current;
        if (!track || products.length === 0) return;

        const motionPreference = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const groupLength = products.length * Math.max(
            1,
            Math.ceil(MIN_LOOP_ITEMS / products.length)
        );

        let cycleWidth = 0;
        let isVisible = false;
        let frameId = 0;
        let previousTime = 0;
        let pendingDistance = 0;

        const setPosition = (position) => {
            const previousScroll = track.scrollLeft;
            track.scrollLeft = position;

            const adjustment = track.scrollLeft - previousScroll;

            if (draggingRef.current) {
                draggingRef.current.startScroll += adjustment;
            }
        };

        const measure = () => {
            const first = track.children[0];
            const nextGroup = track.children[groupLength];

            if (!first || !nextGroup) return;

            const newWidth =
                nextGroup.getBoundingClientRect().left
                - first.getBoundingClientRect().left;

            if (newWidth <= 0) return;

            const oldPosition = cycleWidth
                ? ((track.scrollLeft % cycleWidth) + cycleWidth) % cycleWidth
                : 0;

            const progress = cycleWidth
                ? oldPosition / cycleWidth
                : 0;

            cycleWidth = newWidth;
            setPosition(cycleWidth + progress * cycleWidth);
        };

        const normalizePosition = () => {
            if (!cycleWidth) return;

            // Avoid moving a keyboard-focused card out of view.
            if (focusedRef.current) return;

            const current = track.scrollLeft;

            if (
                current >= cycleWidth
                && current < cycleWidth * 2
            ) {
                return;
            }

            const relativePosition =
                ((current - cycleWidth) % cycleWidth + cycleWidth)
                % cycleWidth;

            setPosition(cycleWidth + relativePosition);
        };

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(track);

        const visibilityObserver = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry.isIntersecting;
            },
            { threshold: 0.1 }
        );

        visibilityObserver.observe(track);

        track.addEventListener(
            "scroll",
            normalizePosition,
            { passive: true }
        );

        measure();

        const animate = (time) => {
            const elapsed = previousTime
                ? Math.min(time - previousTime, 50)
                : 0;

            previousTime = time;

            const shouldPause =
                !isVisible
                || document.hidden
                || motionPreference.matches
                || hoveredRef.current
                || focusedRef.current
                || touchingRef.current
                || draggingRef.current
                || Date.now() - lastInteractionRef.current
                    < INTERACTION_DELAY;

            if (!shouldPause && cycleWidth > 0) {
                normalizePosition();

                pendingDistance +=
                    (elapsed / 1000) * AUTO_SCROLL_SPEED;

                const distance = Math.floor(pendingDistance);

                if (distance > 0) {
                    track.scrollLeft += distance;
                    pendingDistance -= distance;
                    normalizePosition();
                }
            } else {
                pendingDistance = 0;
            }

            frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        return () => {
            window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            visibilityObserver.disconnect();

            track.removeEventListener(
                "scroll",
                normalizePosition
            );

            draggingRef.current = null;
            touchingRef.current = false;
            track.classList.remove("is-dragging");
        };
    }, [products]);

    const recordInteraction = () => {
        lastInteractionRef.current = Date.now();
    };

    const startDrag = (event) => {
        recordInteraction();
        suppressClickRef.current = false;

        // Touch keeps native swipe; cart buttons keep normal clicks.
        if (
            event.pointerType !== "mouse"
            || event.button !== 0
            || event.target.closest("button")
        ) {
            return;
        }

        const track = event.currentTarget;

        draggingRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: track.scrollLeft,
            moved: false,
        };
    };

    const moveDrag = (event) => {
        const drag = draggingRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        const distance = event.clientX - drag.startX;
        const track = event.currentTarget;

        if (!drag.moved && Math.abs(distance) > 6) {
            drag.moved = true;
            suppressClickRef.current = true;

            track.setPointerCapture(event.pointerId);
            track.classList.add("is-dragging");
        }

        if (!drag.moved) return;

        event.preventDefault();
        track.scrollLeft = drag.startScroll - distance;
    };

    const stopDrag = (event) => {
        const track = event.currentTarget;
        const drag = draggingRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        draggingRef.current = null;
        recordInteraction();

        track.classList.remove("is-dragging");

        if (track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
        }
    };

    const finishTouch = () => {
        touchingRef.current = false;
        recordInteraction();
    };

    const handleKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;

        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
            return;
        }

        event.preventDefault();
        recordInteraction();

        const track = event.currentTarget;
        const firstCard = track.firstElementChild;

        if (!firstCard) return;

        const gap = parseFloat(
            window.getComputedStyle(track).columnGap
        ) || 0;

        const step = firstCard.getBoundingClientRect().width + gap;
        const direction = event.key === "ArrowRight" ? 1 : -1;

        track.scrollLeft += direction * step;
    };

    return (
        <section
            className="home-product-section"
            aria-labelledby={titleId}
        >
            <div className="container-fluid website-shell">
                <div className="home-categories-header">
                    <h2
                        id={titleId}
                        className="home-categories-title"
                    >
                        {section.title}
                    </h2>

                    <Link
                        to={section.viewAllPath}
                        className="home-categories-view-all"
                    >
                        View All
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </Link>
                </div>

                <ul
                    ref={trackRef}
                    className="home-product-track"
                    aria-labelledby={titleId}
                    tabIndex={0}
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                    onLostPointerCapture={stopDrag}
                    onDragStart={(event) => {
                        event.preventDefault();
                    }}
                    onMouseEnter={() => {
                        hoveredRef.current = true;
                    }}
                    onMouseLeave={() => {
                        hoveredRef.current = false;

                        if (!draggingRef.current?.moved) {
                            draggingRef.current = null;
                        }
                    }}
                    onFocusCapture={() => {
                        focusedRef.current = true;
                    }}
                    onBlurCapture={(event) => {
                        if (
                            !event.currentTarget.contains(
                                event.relatedTarget
                            )
                        ) {
                            focusedRef.current = false;
                            recordInteraction();
                        }
                    }}
                    onWheel={recordInteraction}
                    onTouchStart={() => {
                        touchingRef.current = true;
                        recordInteraction();
                    }}
                    onTouchEnd={finishTouch}
                    onTouchCancel={finishTouch}
                    onClickCapture={(event) => {
                        if (
                            !suppressClickRef.current
                            || event.detail === 0
                        ) {
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();

                        suppressClickRef.current = false;
                    }}
                    onKeyDown={handleKeyDown}
                >
                    {[0, 1, 2].flatMap((copy) =>
                        loopProducts.map((product, index) => (
                            <li
                                key={`${copy}-${index}-${product._id}`}
                                className="home-product-item"
                            >
                                <ProductCard product={product} />
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </section>
    );
}

// ================== HOME PRODUCT SECTIONS ==================
function ProductSections({ sections = previewSections }) {
    const visibleSections = sections.filter(
        (section) => section.products?.length > 0
    );

    if (visibleSections.length === 0) return null;

    return (
        <div className="home-product-sections">
            {visibleSections.map((section) => (
                <ProductRow
                    key={section.key}
                    section={section}
                />
            ))}
        </div>
    );
}

export default ProductSections;