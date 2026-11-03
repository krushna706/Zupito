import { Link } from "react-router-dom";

// ================== SHOPPING CATEGORIES ==================
const categories = [
    { slug: "mobiles", name: "Mobiles" },
    { slug: "laptops", name: "Laptops" },
    { slug: "headphones", name: "Headphones", extension: "jpg" },
    { slug: "mens-wear", name: "Men's Wear" },
    { slug: "womens-wear", name: "Women's Wear" },
    { slug: "kids-wear", name: "Kids' Wear" },
    { slug: "footwear", name: "Footwear" },
    { slug: "watches", name: "Watches" },
    { slug: "personal-care", name: "Personal Care" },
    { slug: "daily-essentials", name: "Daily Essentials" },
    { slug: "snacks-drinks", name: "Snacks & Drinks" },
    { slug: "beauty", name: "Beauty" },
    { slug: "home-kitchen", name: "Home & Kitchen" },
    { slug: "backpacks", name: "Backpacks", extension: "jpg" },
    { slug: "trolley-bags", name: "Trolley Bags", extension: "jpg" },
    { slug: "travel-accessories", name: "Travel Accessories", extension: "jpg" },
];

// ================== CATEGORY SECTION ==================
function CategorySection() {
    return (
        <section
            className="home-categories"
            aria-labelledby="home-categories-title"
        >
            <div className="container-fluid website-shell">

                <ul className="home-categories-grid">
                    {categories.map((category) => (
                        <li key={category.slug}>
                            <Link
                                to={`/products?category=${category.slug}`}
                                className="home-category-card"
                            >
                                <div className="home-category-image">
                                    <img
                                       src={`/images/categories/${category.slug}.${category.extension || "webp"}`}
                                        alt=""
                                        width="240"
                                        height="240"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>

                                <span className="home-category-name">
                                    {category.name}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export default CategorySection;