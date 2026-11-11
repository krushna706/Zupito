import { Link } from "react-router-dom";

function CategorySection({ categories = [] }) {
    if (!categories.length) return null;

    return (
        <section className="home-categories" aria-label="Shop by category">
            <div className="container-fluid website-shell">
                <ul className="home-categories-grid">
                    {categories.map((category) => (
                        <li key={category.id}>
                            <Link
                                to={`/products?category=${encodeURIComponent(category.id)}`}
                                className="home-category-card"
                            >
                                <div className="home-category-image">
                                    {category.image && (
                                        <img
                                            src={category.image}
                                            alt=""
                                            width="240"
                                            height="240"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    )}
                                </div>

                                <span className="home-category-name">{category.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export default CategorySection;
