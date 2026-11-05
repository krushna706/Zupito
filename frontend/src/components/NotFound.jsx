import { Link } from "react-router-dom";

function NotFound() {
    return (
        <section className="container-fluid website-shell text-center py-5">
            <h1>404</h1>

            <h2 className="section-title">Page not found</h2>

            <p className="text-muted">The page you are looking for does not exist or has been moved.</p>

            <Link to="/" className="btn btn-primary">
                Back to Home
            </Link>
        </section>
    );
}

export default NotFound;
