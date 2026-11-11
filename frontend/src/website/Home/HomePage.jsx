import { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";

import Hero from "./Hero";
import CategorySection from "./CategorySection";
import ProductSections from "./ProductSections";
import { getPublicProducts } from "../../services/productService";

function HomePage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;

        setData(null);
        setError("");

        getPublicProducts({ sort: "newest", limit: 30 })
            .then((result) => {
                if (active) setData(result);
            })
            .catch((requestError) => {
                if (!active) return;

                setError(requestError.message || "Unable to load products. Please try again.");
            });

        return () => {
            active = false;
        };
    }, [reload]);

    const products = data?.products || [];
    const groups = [...new Set(products.map((product) => product.group))];

    const categories = (data?.categories || []).filter(
        (category) => category.showOnHome && category.image
    );

    const sections = products.length
        ? [
              {
                  key: "new-arrivals",
                  title: "New Arrivals",
                  viewAllPath: "/products?sort=newest",
                  products: products.slice(0, 12),
              },

              ...groups.slice(0, 4).map((group) => {
                  const items = products.filter((product) => product.group === group);

                  return {
                      key: group,
                      title: items[0].groupName,
                      viewAllPath: `/products?category=${encodeURIComponent(group)}`,
                      products: items.slice(0, 12),
                  };
              }),
          ]
        : [];

    return (
        <>
            <Hero />

            {error && (
                <div className="container-fluid website-shell">
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" onClick={() => setReload((value) => value + 1)}>
                                Retry
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                </div>
            )}

            {!data && !error && (
                <div className="container-fluid website-shell">
                    <p role="status">Loading products...</p>
                </div>
            )}

            {data && (
                <>
                    <CategorySection categories={categories} />
                    <ProductSections sections={sections} />

                    {!products.length && (
                        <div className="container-fluid website-shell">
                            <div className="products-empty">
                                <h2>Products are coming soon</h2>
                                <p>Check back for new arrivals.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default HomePage;
