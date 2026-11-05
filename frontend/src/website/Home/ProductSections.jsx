import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../../components/ProductCard";
import { productCatalog } from "../../data/productCatalog";
import { getDisplayVariant, getProductView } from "../../utils/productVariants";

// Keep this export until the listing page imports the catalogue directly.

const productMap = new Map(productCatalog.map((product) => [product._id, product]));

const selectProducts = (...ids) => ids.map((id) => productMap.get(`preview-${id}`)).filter(Boolean);

// Add another object here to introduce a new home section.
const previewSections = [
    {
        key: "featured",
        title: "Featured Products",
        viewAllPath: "/products?collection=featured",
        products: selectProducts(
            "smartphone",
            "headphones",
            "shirt",
            "shoes",
            "watch",
            "backpack",
            "laptop",
            "kitchen"
        )
    },
    {
        key: "top-selling",
        title: "Top Selling",
        viewAllPath: "/products?sort=best-selling",
        products: selectProducts(
            "headphones",
            "shoes",
            "watch",
            "smartphone",
            "backpack",
            "snacks",
            "shirt",
            "personal-care"
        ),
        // Populate from sales data when the API is connected.
        preferredVariantIds: {}
    },
    {
        key: "fashion",
        title: "Fashion Picks",
        viewAllPath: "/products?category=fashion",
        products: selectProducts("shirt", "dress", "kids", "shoes", "watch", "backpack")
    },
    {
        key: "daily-essentials",
        title: "Daily Essentials",
        viewAllPath: "/products?collection=daily-essentials",
        products: selectProducts("pantry", "personal-care", "snacks", "kitchen")
    },
    {
        key: "new-arrivals",
        title: "New Arrivals",
        viewAllPath: "/products?sort=newest",
        products: selectProducts("laptop", "dress", "beauty", "trolley", "travel", "kids", "kitchen", "watch")
    }
];

const MIN_LOOP_ITEMS = 12;
const AUTO_SCROLL_SPEED = 24;
const INTERACTION_DELAY = 1500;

function ProductRow({ section }) {
    const trackRef = useRef(null);
    const draggingRef = useRef(null);
    const suppressClickRef = useRef(false);
    const hoveredRef = useRef(false);
    const focusedRef = useRef(false);
    const touchingRef = useRef(false);
    const lastInteractionRef = useRef(0);

    const titleId = `product-section-${section.key}-title`;

    const products = useMemo(() => {
        const seen = new Set();
        const result = [];

        for (const product of section.products ?? []) {
            if (!product?._id || seen.has(product._id)) continue;

            const selectedVariant = getDisplayVariant(product, {
                variantId: product.variantId,
                preferredVariantId: section.preferredVariantIds?.[product._id]
            });

            const view = getProductView(product, selectedVariant);

            if (!view) continue;

            seen.add(product._id);
            result.push(view);
        }

        return result;
    }, [section.products, section.preferredVariantIds]);

    const loopProducts = useMemo(() => {
        if (products.length === 0) return [];

        const repeatCount = Math.max(1, Math.ceil(MIN_LOOP_ITEMS / products.length));

        return Array.from({ length: repeatCount }, () => products).flat();
    }, [products]);

    // Matching copies allow wrapping without changing visible content.
    useEffect(() => {
        const track = trackRef.current;
        if (!track || loopProducts.length === 0) return;

        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

        const groupLength = loopProducts.length;

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

            const newWidth = nextGroup.getBoundingClientRect().left - first.getBoundingClientRect().left;

            if (newWidth <= 0) return;

            const oldPosition = cycleWidth ? ((track.scrollLeft % cycleWidth) + cycleWidth) % cycleWidth : 0;

            const progress = cycleWidth ? oldPosition / cycleWidth : 0;

            cycleWidth = newWidth;
            setPosition(cycleWidth + progress * cycleWidth);
        };

        const normalizePosition = () => {
            if (!cycleWidth || focusedRef.current) return;

            const current = track.scrollLeft;

            if (current >= cycleWidth && current < cycleWidth * 2) {
                return;
            }

            const relativePosition = (((current - cycleWidth) % cycleWidth) + cycleWidth) % cycleWidth;

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

        track.addEventListener("scroll", normalizePosition, { passive: true });

        measure();

        const animate = (time) => {
            const elapsed = previousTime ? Math.min(time - previousTime, 50) : 0;

            previousTime = time;

            const shouldPause =
                !isVisible ||
                document.hidden ||
                motionPreference.matches ||
                hoveredRef.current ||
                focusedRef.current ||
                touchingRef.current ||
                draggingRef.current ||
                Date.now() - lastInteractionRef.current < INTERACTION_DELAY;

            if (!shouldPause && cycleWidth > 0) {
                normalizePosition();

                pendingDistance += (elapsed / 1000) * AUTO_SCROLL_SPEED;

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

            track.removeEventListener("scroll", normalizePosition);

            draggingRef.current = null;
            touchingRef.current = false;
            suppressClickRef.current = false;
            track.classList.remove("is-dragging");
        };
    }, [loopProducts]);

    const recordInteraction = () => {
        lastInteractionRef.current = Date.now();
    };

    const startDrag = (event) => {
        recordInteraction();
        suppressClickRef.current = false;

        // Touch uses native swipe; quantity buttons retain normal clicks.
        if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest("button")) {
            return;
        }

        draggingRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: event.currentTarget.scrollLeft,
            moved: false
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

        const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;

        const step = firstCard.getBoundingClientRect().width + gap;
        const direction = event.key === "ArrowRight" ? 1 : -1;

        track.scrollLeft += direction * step;
    };

    if (products.length === 0) return null;

    return (
        <section className="home-product-section" aria-labelledby={titleId}>
            <div className="container-fluid website-shell">
                <div className="home-categories-header">
                    <h2 id={titleId} className="home-categories-title">
                        {section.title}
                    </h2>

                    {section.viewAllPath && (
                        <Link to={section.viewAllPath} className="home-categories-view-all">
                            View All
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    )}
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
                        if (!event.currentTarget.contains(event.relatedTarget)) {
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
                        if (!suppressClickRef.current || event.detail === 0) {
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
                            <li key={`${copy}-${index}-${product._id}`} className="home-product-item">
                                <ProductCard product={product} variantId={product.variantId} />
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </section>
    );
}

function ProductSections({ sections = previewSections }) {
    const visibleSections = sections.filter((section) => section.products?.length > 0);

    if (visibleSections.length === 0) return null;

    return (
        <div className="home-product-sections">
            {visibleSections.map((section) => (
                <ProductRow key={section.key} section={section} />
            ))}
        </div>
    );
}

export default ProductSections;
