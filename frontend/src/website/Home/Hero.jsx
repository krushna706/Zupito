import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const slides = [
    {
        id: "electronics",
        label: "Everyday tech",
        title: "Upgrade your everyday.",
        description: "Discover gadgets and accessories for work, play and everything in between.",
        image: "/images/hero_electronics.webp",
        button: "Explore Electronics",
        path: "/products?search=electronics"
    },
    {
        id: "fashion",
        label: "Find your style",
        title: "Fresh looks. Your style.",
        description: "Explore clothing and accessories that bring your everyday wardrobe together.",
        image: "/images/hero_fashion.webp",
        button: "Explore Fashion",
        path: "/products?search=fashion"
    },
    {
        id: "grocery",
        label: "Everyday essentials",
        title: "Fresh picks for your home.",
        description: "Shop fresh produce and everyday essentials for your kitchen and beyond.",
        image: "/images/hero_grocery.webp",
        button: "Explore Grocery",
        path: "/products?search=grocery"
    }
];

function Hero() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Restart the timer after a manual slide change.
    useEffect(() => {
        if (!isPlaying) return;

        const timer = window.setTimeout(() => {
            setActiveIndex((current) => (current + 1) % slides.length);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [activeIndex, isPlaying]);

    const changeSlide = (direction) => {
        setActiveIndex((current) => (current + direction + slides.length) % slides.length);
    };

    return (
        <section className="home-hero" aria-label="Featured collections" aria-roledescription="carousel">
            <div className="container-fluid website-shell">
                <div className="home-hero-slider">
                    {/* Full-width image banners */}
                    <div
                        id="home-hero-slides"
                        className="home-hero-slides"
                        style={{
                            transform: `translate3d(-${activeIndex * 100}%, 0, 0)`
                        }}
                        aria-live={isPlaying ? "off" : "polite"}
                    >
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`home-hero-slide home-hero-${slide.id}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
                                aria-hidden={index !== activeIndex}
                                inert={index !== activeIndex ? true : undefined}
                            >
                                <img
                                    src={slide.image}
                                    alt=""
                                    className="home-hero-image"
                                    fetchPriority={index === 0 ? "high" : "auto"}
                                    decoding="async"
                                />

                                <div className="home-hero-content">
                                    <span className="home-hero-eyebrow">{slide.label}</span>

                                    <h1 className="home-hero-title">{slide.title}</h1>

                                    <p className="home-hero-description">{slide.description}</p>

                                    <Link
                                        to={slide.path}
                                        className="btn home-hero-button"
                                        onFocus={() => setIsPlaying(false)}
                                    >
                                        {slide.button}
                                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Previous and next */}
                    <button
                        type="button"
                        className="home-hero-arrow home-hero-prev"
                        onClick={() => changeSlide(-1)}
                        aria-label="Previous banner"
                        aria-controls="home-hero-slides"
                    >
                        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                    </button>

                    <button
                        type="button"
                        className="home-hero-arrow home-hero-next"
                        onClick={() => changeSlide(1)}
                        aria-label="Next banner"
                        aria-controls="home-hero-slides"
                    >
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </button>

                    {/* Controls inside the banner */}
                    <div className="home-hero-controls">
                        <div className="home-hero-dots" role="group" aria-label="Choose banner">
                            {slides.map((slide, index) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    className={`home-hero-dot ${index === activeIndex ? "is-active" : ""}`}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`Show ${slide.label} banner`}
                                    aria-current={index === activeIndex ? "true" : undefined}
                                    aria-controls="home-hero-slides"
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            className="home-hero-play"
                            onClick={() => setIsPlaying((current) => !current)}
                            aria-label={isPlaying ? "Pause automatic slides" : "Start automatic slides"}
                        >
                            <i
                                className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;
