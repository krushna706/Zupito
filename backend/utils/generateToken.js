const jwt = require("jsonwebtoken");

// Shared expiry for JWT, cookie and database session.
const SESSION_MAX_AGE = 15 * 24 * 60 * 60 * 1000;

function generateToken(user, session) {
    return jwt.sign(
        {
            sid: String(session._id),
            version: user.tokenVersion,
        },
        process.env.JWT_SECRET,
        {
            subject: String(user._id),
            expiresIn: SESSION_MAX_AGE / 1000,
            algorithm: "HS256",
            issuer: "zupito",
            audience: "zupito-web",
        }
    );
}

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
});

module.exports = {
    generateToken,
    cookieOptions,
    SESSION_MAX_AGE,
};
