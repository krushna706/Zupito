
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// ================== PRODUCT GALLERY ==================
function ProductGallery({ productId, name = "Product", image, images = [] }) {
    const sources = [...new Set(
        [image, ...images].filter((src) => typeof src === "string" && src.trim())
    )];

    return <Gallery key={JSON.stringify([productId, sources])} name={name} images={sources} />;
}

function Gallery({ name, images }) {
    const count = images.length;
    const multiple = count > 1;
    const [position, setPosition] = useState(multiple ? 1 : 0);
    const [instant, setInstant] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    const trackRef = useRef(null);
    const viewportRef = useRef(null);
    const thumbnailsRef = useRef([]);
    const movingRef = useRef(false);
    const touchRef = useRef(null);
    const lastInteractionRef = useRef(0);

    const activeIndex = multiple ? (position - 1 + count) % count : 0;
    const slides = multiple ? [images[count - 1], ...images, images[0]] : images;

    useLayoutEffect(() => {
        trackRef.current?.style.setProperty("--gallery-offset", `${-position * 100}%`);
    }, [position]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReducedMotion(media.matches);

        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const item = thumbnailsRef.current[activeIndex];
        const list = item?.parentElement;
        if (!item || !list) return;

        const top = item.offsetTop - list.offsetTop;
        const left = item.offsetLeft - list.offsetLeft;

        if (top < list.scrollTop) list.scrollTop = top;
        else if (top + item.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTop = top + item.offsetHeight - list.clientHeight;
        }

        if (left < list.scrollLeft) list.scrollLeft = left;
        else if (left + item.offsetWidth > list.scrollLeft + list.clientWidth) {
            list.scrollLeft = left + item.offsetWidth - list.clientWidth;
        }
    }, [activeIndex]);

    const finishSlide = () => {
        if (position === 0 || position === count + 1) {
            setInstant(true);
            setPosition(position === 0 ? count : 1);
        } else {
            movingRef.current = false;
        }
    };

    useEffect(() => {
        if (!instant) return;

        let secondFrame;
        const firstFrame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(() => {
                setInstant(false);
                movingRef.current = false;
            });
        });

        return () => {
            cancelAnimationFrame(firstFrame);
            cancelAnimationFrame(secondFrame);
        };
    }, [instant]);

    useEffect(() => {
        if (!movingRef.current || instant) return;

        const timeout = setTimeout(() => {
            if (position === 0 || position === count + 1) {
                setInstant(true);
                setPosition(position === 0 ? count : 1);
            } else {
                movingRef.current = false;
            }
        }, reducedMotion ? 0 : 700);

        return () => clearTimeout(timeout);
    }, [position, instant, count, reducedMotion]);

    useEffect(() => {
        if (!multiple || hovered || focused || zoomed || reducedMotion) return;

        const interval = setInterval(() => {
            if (
                document.hidden || movingRef.current || touchRef.current ||
                Date.now() - lastInteractionRef.current < 5000
            ) return;

            movingRef.current = true;
            setPosition((value) => value + 1);
        }, 4500);

        return () => clearInterval(interval);
    }, [multiple, hovered, focused, zoomed, reducedMotion]);

    const moveSlide = (direction) => {
        if (!multiple || movingRef.current) return;

        movingRef.current = true;
        lastInteractionRef.current = Date.now();
        setZoomed(false);
        setPosition((value) => value + direction);
    };

    const selectSlide = (index) => {
        if (movingRef.current || activeIndex === index) return;

        movingRef.current = true;
        lastInteractionRef.current = Date.now();
        setZoomed(false);
        setPosition(index + 1);
    };

    const onTouchStart = (event) => {
        if (zoomed || !multiple || event.touches.length !== 1) return;

        lastInteractionRef.current = Date.now();
        touchRef.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
    };

    const onTouchEnd = (event) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || !event.changedTouches.length) return;

        const x = event.changedTouches[0].clientX - start.x;
        const y = event.changedTouches[0].clientY - start.y;

        if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.25) {
            moveSlide(x < 0 ? 1 : -1);
        }
    };

    const moveZoom = (event) => {
        if (!zoomed || event.pointerType !== "mouse") return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

        event.currentTarget.style.setProperty("--gallery-zoom-origin", `${x}% ${y}%`);
    };

    if (!count) {
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
                if (event.key === "Escape") setZoomed(false);
            }}
        >
            {multiple && (
                <div className="product-gallery-thumbnails" role="group" aria-label="Choose product image">
                    {images.map((source, index) => (
                        <button
                            key={source}
                            ref={(element) => { thumbnailsRef.current[index] = element; }}
                            type="button"
                            className={`product-gallery-thumbnail ${index === activeIndex ? "is-active" : ""}`}
                            aria-label={`Show image ${index + 1} of ${count}`}
                            aria-pressed={index === activeIndex}
                            onClick={() => selectSlide(index)}
                        >
                            <img src={source} alt="" width="80" height="80" loading="lazy" draggable={false} />
                        </button>
                    ))}
                </div>
            )}

            <div className="product-gallery-main">
                <div
                    ref={viewportRef}
                    className={`product-gallery-viewport ${zoomed ? "is-zoomed" : ""}`}
                    tabIndex={0}
                    role="group"
                    aria-label="Product image viewer"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onTouchCancel={() => { touchRef.current = null; }}
                    onPointerMove={moveZoom}
                    onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;

                        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                            event.preventDefault();
                            moveSlide(event.key === "ArrowLeft" ? -1 : 1);
                        }
                    }}
                >
                    <div
                        ref={trackRef}
                        className={`product-gallery-track ${instant || reducedMotion ? "is-instant" : ""}`}
                        onTransitionEnd={(event) => {
                            if (
                                event.target === event.currentTarget &&
                                event.propertyName === "transform"
                            ) finishSlide();
                        }}
                    >
                        {slides.map((source, index) => (
                            <div
                                key={`${index}-${source}`}
                                className={`product-gallery-slide ${index === position ? "is-current" : ""}`}
                                aria-hidden={index !== position}
                            >
                                <img
                                    src={source}
                                    alt={`${name} — image ${activeIndex + 1}`}
                                    draggable={false}
                                    decoding="async"
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
                        viewportRef.current?.style.setProperty("--gallery-zoom-origin", "50% 50%");
                        setZoomed((current) => !current);
                        lastInteractionRef.current = Date.now();
                    }}
                >
                    <i
                        className={`fa-solid ${
                            zoomed ? "fa-magnifying-glass-minus" : "fa-magnifying-glass-plus"
                        }`}
                        aria-hidden="true"
                    />
                </button>
            </div>
        </section>
    );
}

export default ProductGallery;
