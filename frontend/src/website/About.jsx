import { Link } from "react-router-dom";
import { appConfig } from "../config/appConfig";

const benefits = [
    {
        icon: "fa-layer-group",
        title: "Wide Product Selection",
        description:
            "Explore electronics, fashion, groceries and travel essentials in one convenient marketplace."
    },
    {
        icon: "fa-cart-shopping",
        title: "Simple Shopping",
        description: "Find products, compare variants and enjoy a straightforward shopping experience."
    },
    {
        icon: "fa-location-dot",
        title: "Flexible Delivery",
        description: "Choose from saved delivery addresses and manage where your orders should arrive."
    }
];

const values = [
    {
        icon: "fa-handshake",
        title: "Trust",
        description:
            "We believe in clear communication, transparency and building lasting customer relationships."
    },
    {
        icon: "fa-heart",
        title: "Customer First",
        description: "Every shopping experience should be simple, comfortable and focused on customer needs."
    },
    {
        icon: "fa-lightbulb",
        title: "Innovation",
        description: "We aim to improve the shopping journey through practical ideas and better technology."
    },
    {
        icon: "fa-arrow-trend-up",
        title: "Continuous Growth",
        description:
            "We focus on improving our marketplace and creating better opportunities for everyone involved."
    }
];

const experience = [
    {
        icon: "fa-magnifying-glass",
        title: "Discover with Ease",
        description: "Browse products across categories with useful search and filtering options."
    },
    {
        icon: "fa-bag-shopping",
        title: "Shop with Confidence",
        description: "Review product information, selected variants and order totals before checkout."
    },
    {
        icon: "fa-location-dot",
        title: "Convenient Checkout",
        description: "Manage saved addresses, apply available offers and review delivery charges."
    }
];

function About() {
    return (
        <main className="about-page">
            {/* Shared About & Contact Hero */}
            <section className="website-story-hero about-hero">
                <div className="container-fluid website-shell website-story-hero-content">
                    <nav className="products-breadcrumb" aria-label="Breadcrumb">
                        <Link to="/">Home</Link>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        <span aria-current="page">About Us</span>
                    </nav>

                    <div className="about-hero-text">
                        <span className="about-eyebrow">GET TO KNOW ZUPITO</span>

                        <h1>
                            More than shopping.
                            <span> More possibilities.</span>
                        </h1>

                        <p>Discover a simpler way to shop for your everyday essentials and favorite finds.</p>
                    </div>
                </div>
            </section>

            {/* Who We Are */}
            <section className="about-introduction">
                <div className="container-fluid website-shell">
                    <div className="about-intro-grid">
                        <div className="about-intro-visual">
                            <div className="about-intro-image">
                                <img
                                    src="/images/about-story.jpg"
                                    alt="Online shopping products and delivery packages"
                                    loading="lazy"
                                />
                            </div>

                            <div className="about-intro-image-caption">
                                <span>
                                    <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                                </span>

                                <div>
                                    <strong>Everything in One Place</strong>
                                    <p>Everyday essentials. Exceptional finds.</p>
                                </div>
                            </div>
                        </div>

                        <div className="about-intro-content">
                            <span className="about-section-eyebrow">WHO WE ARE</span>

                            <h2>
                                Making everyday shopping
                                <span> easier and better.</span>
                            </h2>

                            <p>
                                Welcome to <strong>{appConfig.name}</strong>, a multi-category online
                                marketplace designed to bring different shopping needs together in one
                                convenient place.
                            </p>

                            <p>
                                From electronics and fashion to groceries and travel essentials, we aim to
                                make discovering and choosing products simple, comfortable and enjoyable.
                            </p>

                            <p>
                                Our approach focuses on useful product information, easy navigation and a
                                shopping experience that puts convenience first.
                            </p>

                            <div className="about-intro-highlights">
                                <span>
                                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                    Multiple Categories
                                </span>

                                <span>
                                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                    Convenient Shopping
                                </span>
                            </div>

                            <Link to="/products" className="about-primary-button">
                                Explore Products
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="about-mission-section">
                <div className="container-fluid website-shell">
                    <div className="about-section-heading">
                        <span className="about-section-eyebrow">WHAT DRIVES US</span>

                        <h2>
                            A clear purpose.
                            <span> A better shopping experience.</span>
                        </h2>

                        <p>
                            Our mission guides what we build today. Our vision shapes what we aim to achieve.
                        </p>
                    </div>

                    <div className="about-mission-grid">
                        <article className="about-mission-card">
                            <div className="about-mission-top">
                                <span className="about-mission-icon">
                                    <i className="fa-solid fa-bullseye" aria-hidden="true" />
                                </span>

                                <span className="about-mission-number">01</span>
                            </div>

                            <span className="about-card-eyebrow">OUR MISSION</span>

                            <h3>Make shopping simple and accessible.</h3>

                            <p>
                                To create a convenient shopping destination where customers can discover
                                products across multiple categories with ease.
                            </p>

                            <ul>
                                <li>Bring different product categories together.</li>
                                <li>Keep product discovery simple and organized.</li>
                                <li>Make shopping and checkout straightforward.</li>
                                <li>Improve the overall customer experience.</li>
                            </ul>

                            <div className="about-mission-footer">
                                <i className="fa-solid fa-circle" aria-hidden="true" />
                                Convenience in every step.
                            </div>
                        </article>

                        <article className="about-mission-card about-mission-card-dark">
                            <div className="about-mission-top">
                                <span className="about-mission-icon">
                                    <i className="fa-solid fa-compass" aria-hidden="true" />
                                </span>

                                <span className="about-mission-number">02</span>
                            </div>

                            <span className="about-card-eyebrow">OUR VISION</span>

                            <h3>Build a better everyday marketplace.</h3>

                            <p>
                                To develop a marketplace that connects customers with more choices while
                                continuously improving convenience and usability.
                            </p>

                            <ul>
                                <li>Expand product variety and accessibility.</li>
                                <li>Support a customer-focused marketplace.</li>
                                <li>Encourage innovation in online shopping.</li>
                                <li>Build a scalable shopping platform.</li>
                            </ul>

                            <div className="about-mission-footer">
                                <i className="fa-solid fa-circle" aria-hidden="true" />
                                Progress through innovation.
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            {/* Why Choose Zupito */}
            <section className="about-benefits-section">
                <div className="container-fluid website-shell">
                    <div className="about-section-heading">
                        <span className="about-section-eyebrow">WHY ZUPITO</span>

                        <h2>
                            Designed for
                            <span> everyday convenience.</span>
                        </h2>

                        <p>A shopping experience built around choice, simplicity and useful features.</p>
                    </div>

                    <div className="about-benefits-grid">
                        {benefits.map((benefit, index) => (
                            <article className="about-benefit-card" key={benefit.title}>
                                <div className="about-benefit-top">
                                    <span className="about-benefit-icon">
                                        <i className={`fa-solid ${benefit.icon}`} aria-hidden="true" />
                                    </span>

                                    <span className="about-benefit-number">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>

                                <h3>{benefit.title}</h3>
                                <p>{benefit.description}</p>

                                <span className="about-benefit-decoration" aria-hidden="true" />
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="about-values-section">
                <div className="container-fluid website-shell">
                    <div className="about-section-heading">
                        <span className="about-section-eyebrow">OUR CORE VALUES</span>

                        <h2>
                            Principles that
                            <span> guide us.</span>
                        </h2>

                        <p>The ideas behind our decisions, improvements and customer experience.</p>
                    </div>

                    <div className="about-values-grid">
                        {values.map((value, index) => (
                            <article className="about-value-card" key={value.title}>
                                <div className="about-value-top">
                                    <span className="about-value-icon">
                                        <i className={`fa-solid ${value.icon}`} aria-hidden="true" />
                                    </span>

                                    <span className="about-value-number">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>

                                <h3>{value.title}</h3>
                                <p>{value.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Shopping Experience */}
            <section className="about-experience-section">
                <div className="container-fluid website-shell">
                    <div className="about-experience-grid">
                        <div className="about-experience-content">
                            <span className="about-section-eyebrow">THE ZUPITO EXPERIENCE</span>

                            <h2>
                                Shopping made simple.
                                <span> From start to finish.</span>
                            </h2>

                            <p>
                                Our goal is to make the shopping journey easy to understand, from exploring
                                products to reviewing an order before payment.
                            </p>

                            <Link to="/products" className="about-outline-button">
                                Discover Products
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </Link>
                        </div>

                        <div className="about-experience-list">
                            {experience.map((item) => (
                                <article className="about-experience-card" key={item.title}>
                                    <span className="about-experience-icon">
                                        <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                                    </span>

                                    <div>
                                        <h3>{item.title}</h3>
                                        <p>{item.description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="about-cta-section">
                <div className="container-fluid website-shell">
                    <div className="about-cta">
                        <span className="about-cta-icon">
                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                        </span>

                        <div className="about-cta-content">
                            <h2>
                                Explore <span>Zupito</span> Today
                            </h2>

                            <p>
                                Discover products across categories and enjoy a convenient shopping
                                experience.
                            </p>
                        </div>

                        <Link to="/products" className="about-cta-button">
                            Shop Now
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default About;
