import { getPanelRole } from "../config/panelConfig";

const SESSION_KEY = "zupito_session";

// Local accounts for frontend testing; replace this service with API calls later.
const accounts = [
    {
        id: "customer",
        name: "Zupito Customer",
        email: "customer@zupito.test",
        phone: "9000000001",
        role: "customer",
        password: "Zupito@123"
    },
    {
        id: "admin",
        name: "Zupito Admin",
        email: "admin@zupito.test",
        phone: "9000000002",
        role: "admin",
        password: "Zupito@123"
    },
    {
        id: "seller",
        name: "Zupito Seller",
        email: "seller@zupito.test",
        phone: "9000000003",
        role: "seller",
        password: "Zupito@123"
    },
    {
        id: "delivery",
        name: "Zupito Delivery",
        email: "delivery@zupito.test",
        phone: "9000000004",
        role: "delivery",
        password: "Zupito@123"
    }
];

export function readSession() {
    try {
        const user = JSON.parse(sessionStorage.getItem(SESSION_KEY));
        return user?.id && (user.role === "customer" || getPanelRole(user.role)) ? user : null;
    } catch {
        return null;
    }
}

export function login(identifier, password) {
    const value = identifier.trim().toLowerCase();
    const account = accounts.find((item) => item.email === value || item.phone === value);
    if (!account || account.password !== password)
        throw new Error("Incorrect email, phone number or password.");
    const { id, name, email, phone, role } = account;
    const user = { id, name, email, phone, role };
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
        /* Session remains in memory. */
    }
    return user;
}

export function register({ name, email, phone, password }) {
    if (accounts.some((item) => item.email === email || item.phone === phone)) {
        throw new Error("Email or mobile number is already registered.");
    }
    accounts.push({ id: crypto.randomUUID(), name, email, phone, password, role: "customer" });
}

export function logout() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        /* Clear the in-memory session too. */
    }
}

export function getLoginDestination(user, returnTo) {
    if (user.role !== "customer") return "/manage/dashboard";
    if (
        typeof returnTo === "string" &&
        /^\/(?:account(?:\/|$)|checkout(?:[/?#]|$)|order-confirmation\/|products(?:[/?#]|$)|cart(?:[/?#]|$))/.test(
            returnTo
        )
    ) {
        return returnTo;
    }
    return "/";
}
