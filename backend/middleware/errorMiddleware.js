module.exports = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    let status = error.statusCode || 500;
    let message = error.message;

    if (error.code === 11000) {
        status = 409;
        message =
            error.keyPattern?.email || error.keyPattern?.phone
                ? "An account with this email or phone number already exists."
                : "This record already exists. Refresh and try again.";
    } else if (error.name === "ValidationError" || error.name === "CastError") {
        status = 400;
        message = "Please check the submitted details.";
    } else if (error.type === "entity.parse.failed") {
        status = 400;
        message = "Invalid JSON request.";
    } else if (error.type === "entity.too.large") {
        status = 413;
        message = "Request is too large.";
    }

    if (status >= 500 && !error.statusCode) {
        console.error("Request failed:", error.stack || error.message);
        message = "Unable to complete your request. Please try again.";
    }

    res.status(status).json({
        success: false,
        message,
    });
};
