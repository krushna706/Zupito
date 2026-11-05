import { createContext, useContext, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(authService.readSession);
    const login = (identifier, password) => {
        const account = authService.login(identifier, password);
        setUser(account);
        return account;
    };
    const logout = () => {
        authService.logout();
        setUser(null);
    };
    const updateProfile = (changes) => {
        const next = { ...user, ...changes };
        setUser(next);
        try {
            sessionStorage.setItem("zupito_session", JSON.stringify(next));
        } catch {
            /* Keep local changes. */
        }
        return next;
    };
    return (
        <AuthContext.Provider value={{ user, login, logout, updateProfile }}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider.");
    return context;
}
