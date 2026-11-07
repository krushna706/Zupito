import { createContext, useContext, useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";

import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;

        authService
            .getCurrentUser()
            .then((account) => {
                if (active) setUser(account);
            })
            .catch((failure) => {
                if (active && failure.status !== 401) {
                    setError(failure.message);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [attempt]);

    const login = async (identifier, password) => {
        const account = await authService.login(identifier, password);
        setUser(account);
        return account;
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (failure) {
            if (failure.status !== 401) throw failure;
        }

        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const account = await authService.getCurrentUser();
            setUser(account);
            return account;
        } catch (failure) {
            if (failure.status === 401) setUser(null);
            throw failure;
        }
    };

    const updateProfile = (changes) => {
        // Profile forms remain separate from session permissions.
        const next = {
            ...user,
            name: changes.name ?? user.name,
            avatar: changes.avatar ?? user.avatar,
        };

        setUser(next);
        return next;
    };

    if (loading) {
        return (
            <p role="status" className="container py-4">
                Loading your session…
            </p>
        );
    }

    if (error) {
        return (
            <div className="container py-4">
                <Alert severity="error">{error}</Alert>

                <Button
                    onClick={() => {
                        setError("");
                        setLoading(true);
                        setAttempt((value) => value + 1);
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <AuthContext.Provider
            value={{ user, login, logout, refreshUser, updateProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }

    return context;
}