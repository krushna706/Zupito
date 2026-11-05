import { useLocation, useNavigate } from "react-router-dom";

function ProductSearchBar() {
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const search = params.get("search") || "";

    function handleSearch(event) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const searchParams = new URLSearchParams();
        const nextSearch = String(formData.get("search") || "").trim();

        if (nextSearch) {
            searchParams.set("search", nextSearch);
        }

        const query = searchParams.toString();

        navigate({
            pathname: "/products",
            search: query ? `?${query}` : ""
        });
    }

    return (
        <form
            key={`${location.pathname}:${location.search}`}
            className="product-search-bar"
            role="search"
            aria-label="Search products"
            onSubmit={handleSearch}
        >
            <div className="product-search-field">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />

                <input
                    name="search"
                    type="search"
                    aria-label="Product name, brand or category"
                    placeholder="Search products, brands and more"
                    defaultValue={search}
                    maxLength={100}
                />
            </div>

            <button type="submit" className="btn btn-primary">
                Search
            </button>
        </form>
    );
}

export default ProductSearchBar;
