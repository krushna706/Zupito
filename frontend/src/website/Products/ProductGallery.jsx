import { useEffect, useRef, useState } from "react";

// ================== GALLERY ==================
function ProductGallery({
    productId,
    name = "Product",
    image,
    images = [],
}) {
    const galleryImages = [...new Set(
        [image, ...images].filter(
            (source) => typeof source === "string" && source.trim()
        )
    )];

    // Reset the gallery when the product or image list changes.
    const galleryKey = JSON.stringify([productId, galleryImages]);

    return (
        <Gallery
            key={galleryKey}
            name={name}
            images={galleryImages}
        />
    );
}

// ================== GALLERY CONTENT ==================
function Gallery({ name, images }) {
    const count = images.length;
    const multipleImages = count > 1;

    const [position, setPosition] = useState(multipleImages ? 1 : 0);
    const [animate, setAnimate] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

    const movingRef = useRef(false);
    const touchRef = useRef(null);
    const lastInteractionRef = useRef(0);
    const thumbnailRefs = useRef([]);

    const activeIndex = multipleImages
        ? (position - 1 + count) % count
        : 0;

    const slides = multipleImages
        ? [images[count - 1], ...images, images[0]]
        : images;

    useEffect(() => {
        const preference = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const updatePreference = () => {
            setReducedMotion(preference.matches);
        };

        updatePreference();
        preference.addEventListener("change", updatePreference);

        return () => {
            preference.removeEventListener("change", updatePreference);
        };
    }, []);

    useEffect(() => {
        const thumbnail = thumbnailRefs.current[activeIndex];
        const list = thumbnail?.parentElement;

        if (!thumbnail || !list) return;

        // Scroll only the thumbnail list, not the page.
        const top = thumbnail.offsetTop - list.offsetTop;
        const left = thumbnail.offsetLeft - list.offsetLeft;

        if (top < list.scrollTop) {
            list.scrollTop = top;
        } else if (
            top + thumbnail.offsetHeight
            > list.scrollTop + list.clientHeight
        ) {
            list.scrollTop =
                top + thumbnail.offsetHeight - list.clientHeight;
        }

        if (left < list.scrollLeft) {
            list.scrollLeft = left;
        } else if (
            left + thumbnail.offsetWidth
            > list.scrollLeft + list.clientWidth
        ) {
            list.scrollLeft =
                left + thumbnail.offsetWidth - list.clientWidth;
        }
    }, [activeIndex]);

    const finishMovement = () => {
        if (position === 0) {
            setAnimate(false);
            setPosition(count);
        } else if (position === count + 1) {
            setAnimate(false);
            setPosition(1);
        } else {
            movingRef.current = false;
        }
    };

    // Restore transitions after the invisible loop reset.
    useEffect(() => {
        if (animate) return;

        let secondFrame;
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
                setAnimate(true);
                movingRef.current = false;
            });
        });

        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
        };
    }, [animate]);

    // Fallback also handles reduced motion and missing transition events.
    useEffect(() => {
        if (!movingRef.current || !animate) return;

        const timer = window.setTimeout(() => {
            if (position === 0 || position === count + 1) {
                setAnimate(false);
                setPosition(position === 0 ? count : 1);
            } else {
                movingRef.current = false;
            }
        }, reducedMotion ? 0 : 700);

        return () => window.clearTimeout(timer);
    }, [position, count, animate, reducedMotion]);

    useEffect(() => {
        if (
            !multipleImages
            || hovered
            || focused
            || zoomed
            || reducedMotion
        ) {
            return;
        }

        const timer = window.setInterval(() => {
            if (
                document.hidden
                || movingRef.current
                || touchRef.current
                || Date.now() - lastInteractionRef.current < 5000
            ) {
                return;
            }

            movingRef.current = true;
            setPosition((current) => current + 1);
        }, 4500);

        return () => window.clearInterval(timer);
    }, [
        multipleImages,
        hovered,
        focused,
        zoomed,
        reducedMotion,
    ]);

    const moveSlide = (direction) => {
        if (!multipleImages || movingRef.current) return;

        lastInteractionRef.current = Date.now();
        movingRef.current = true;
        setZoomed(false);
        setPosition((current) => current + direction);
    };

    const selectSlide = (index) => {
        if (movingRef.current || index === activeIndex) return;

        lastInteractionRef.current = Date.now();
        movingRef.current = true;
        setZoomed(false);
        setPosition(index + 1);
    };

    const handleTouchStart = (event) => {
        if (zoomed || !multipleImages || event.touches.length !== 1) {
            return;
        }

        lastInteractionRef.current = Date.now();

        touchRef.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
    };

    const handleTouchEnd = (event) => {
        const start = touchRef.current;
        touchRef.current = null;

        if (!start || !event.changedTouches.length) return;

        const distanceX = event.changedTouches[0].clientX - start.x;
        const distanceY = event.changedTouches[0].clientY - start.y;

        if (
            Math.abs(distanceX) > 45
            && Math.abs(distanceX) > Math.abs(distanceY) * 1.25
        ) {
            moveSlide(distanceX < 0 ? 1 : -1);
        }
    };

    const handleZoomMovement = (event) => {
        if (!zoomed || event.pointerType !== "mouse") return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const x = Math.max(
            0,
            Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)
        );
        const y = Math.max(
            0,
            Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)
        );

        setZoomOrigin(`${x}% ${y}%`);
    };

    if (count === 0) {
        return (
            <div className="product-gallery-empty">
                <i className="fa-regular fa-image" aria-hidden="true" />
                <span>Image unavailable</span>
            </div>
        );
    }

    return (
        <section
            className="product-gallery"
            aria-label={`${name} images`}
            aria-roledescription="carousel"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFocused(false);
                    lastInteractionRef.current = Date.now();
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    setZoomed(false);
                }
            }}
        >
            {multipleImages && (
                <div
                    className="product-gallery-thumbnails"
                    role="group"
                    aria-label="Choose product image"
                >
                    {images.map((source, index) => (
                        <button
                            key={source}
                            ref={(element) => {
                                thumbnailRefs.current[index] = element;
                            }}
                            type="button"
                            className={`product-gallery-thumbnail ${
                                index === activeIndex ? "is-active" : ""
                            }`}
                            aria-label={`Show image ${index + 1} of ${count}`}
                            aria-pressed={index === activeIndex}
                            onClick={() => selectSlide(index)}
                        >
                            <img
                                src={source}
                                alt=""
                                width="80"
                                height="80"
                                loading="lazy"
                                draggable={false}
                            />
                        </button>
                    ))}
                </div>
            )}

            <div className="product-gallery-main">
                <div
                    className={`product-gallery-viewport ${
                        zoomed ? "is-zoomed" : ""
                    }`}
                    tabIndex={0}
                    role="group"
                    aria-label="Product image viewer"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={() => {
                        touchRef.current = null;
                    }}
                    onPointerMove={handleZoomMovement}
                    onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;

                        if (event.key === "ArrowLeft") {
                            event.preventDefault();
                            moveSlide(-1);
                        }

                        if (event.key === "ArrowRight") {
                            event.preventDefault();
                            moveSlide(1);
                        }
                    }}
                >
                    <div
                        className="product-gallery-track"
                        style={{
                            transform: `translate3d(-${position * 100}%, 0, 0)`,
                            transition: animate && !reducedMotion
                                ? "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)"
                                : "none",
                        }}
                        onTransitionEnd={(event) => {
                            if (
                                event.target === event.currentTarget
                                && event.propertyName === "transform"
                            ) {
                                finishMovement();
                            }
                        }}
                    >
                        {slides.map((source, index) => (
                            <div
                                key={`${index}-${source}`}
                                className="product-gallery-slide"
                                aria-hidden={index !== position}
                            >
                                <img
                                    src={source}
                                    alt={`${name} — image ${activeIndex + 1}`}
                                    draggable={false}
                                    decoding="async"
                                    style={{
                                        transform: zoomed && index === position
                                            ? "scale(1.8)"
                                            : "scale(1)",
                                        transformOrigin: zoomOrigin,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                    <button
                        type="button"
                        className="product-gallery-zoom"
                        aria-label={zoomed ? "Zoom out" : "Zoom in"}
                        aria-pressed={zoomed}
                        onClick={() => {
                            setZoomOrigin("50% 50%");
                            setZoomed((current) => !current);
                            lastInteractionRef.current = Date.now();
                        }}
                    >
                        <i
                            className={`fa-solid ${
                                zoomed
                                    ? "fa-magnifying-glass-minus"
                                    : "fa-magnifying-glass-plus"
                            }`}
                            aria-hidden="true"
                        />
                    </button>
            </div>
        </section>
    );
}

export default ProductGallery;