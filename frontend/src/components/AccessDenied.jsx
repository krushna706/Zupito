import { Link } from "react-router-dom";

export default function AccessDenied() {
    return (
        <section className="container-fluid py-5 text-center">
            <h1>Access denied</h1>
            <p>Your account does not have permission to open this page.</p>
            <Link to="/" className="btn btn-primary">
                Back to website
            </Link>
        </section>
    );
}
