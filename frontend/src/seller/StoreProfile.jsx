import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import * as storeService from "../services/sellerService";

const storeFields = [
    { name: "storeName", label: "Store Name", max: 100, wide: true },
    { name: "storeEmail", label: "Store Email", max: 254 },
    { name: "storePhone", label: "Contact Number", max: 10, numeric: true },
    {
        name: "description",
        label: "Store Description",
        max: 500,
        wide: true,
        multiline: true,
        required: false,
    },
];

const pickupFields = [
    { name: "street", label: "Pickup Address", max: 200, wide: true },
    { name: "locality", label: "Locality / Area", max: 100 },
    { name: "city", label: "City", max: 100 },
    { name: "state", label: "State", max: 100 },
    { name: "pincode", label: "Pincode", max: 6, numeric: true },
    {
        name: "pickupNotes",
        label: "Pickup Instructions (Optional)",
        max: 200,
        wide: true,
        multiline: true,
        required: false,
    },
];

const allFields = [...storeFields, ...pickupFields];

function toForm(store) {
    return {
        storeName: store.storeName || "",
        storeEmail: store.storeEmail || "",
        storePhone: store.storePhone || "",
        description: store.description || "",
        street: store.pickupAddress?.street || "",
        locality: store.pickupAddress?.locality || "",
        city: store.pickupAddress?.city || "",
        state: store.pickupAddress?.state || "",
        pincode: store.pickupAddress?.pincode || "",
        pickupNotes: store.pickupAddress?.pickupNotes || "",
    };
}

function validate(form) {
    const errors = {};

    for (const field of allFields) {
        if (field.required !== false && !form[field.name]) {
            errors[field.name] = "This field is required.";
        }
    }

    if (form.storeName.length < 2) {
        errors.storeName = "Enter at least 2 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.storeEmail)) {
        errors.storeEmail = "Enter a valid email address.";
    }

    if (!/^[6-9]\d{9}$/.test(form.storePhone)) {
        errors.storePhone = "Enter a valid 10-digit mobile number.";
    }

    if (form.street.length < 3) {
        errors.street = "Enter a complete pickup address.";
    }

    for (const key of ["locality", "city", "state"]) {
        if (form[key].length < 2) {
            errors[key] = "Enter at least 2 characters.";
        }
    }

    if (!/^[1-9]\d{5}$/.test(form.pincode)) {
        errors.pincode = "Enter a valid 6-digit pincode.";
    }

    return errors;
}

function StoreField({ item, form, errors, editing, onChange }) {
    const value = form[item.name] || "";

    return (
        <TextField
            name={item.name}
            label={item.label}
            value={value}
            onChange={onChange}
            error={Boolean(errors[item.name])}
            helperText={
                errors[item.name] ||
                (item.multiline ? `${value.length}/${item.max} characters` : " ")
            }
            multiline={Boolean(item.multiline)}
            minRows={item.multiline ? 3 : undefined}
            required={item.required !== false}
            className={item.wide ? "ssp-wide" : ""}
            fullWidth
            size="small"
            slotProps={{
                htmlInput: {
                    maxLength: item.max,
                    inputMode: item.numeric ? "numeric" : undefined,
                },
                input: {
                    readOnly: !editing,
                },
            }}
        />
    );
}

function StoreProfile() {
    const { user, refreshUser } = useAuth();
    const fileRef = useRef(null);

    const [store, setStore] = useState(null);
    const [form, setForm] = useState({});
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [revision, setRevision] = useState(0);

    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [removeLogo, setRemoveLogo] = useState(false);
    const [failedLogo, setFailedLogo] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setError("");

        storeService
            .getStoreProfile(controller.signal)
            .then((result) => {
                if (!active) return;

                setStore(result);
                setForm(toForm(result));
                setEditing(false);
                setLogoFile(null);
                setRemoveLogo(false);
                setErrors({});
            })
            .catch((failure) => {
                if (active) setError(failure.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            controller.abort();
        };
    }, [user?._id, revision]);

    useEffect(() => {
        if (!logoFile) {
            setPreview("");
            return;
        }

        const url = URL.createObjectURL(logoFile);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    const handleChange = (event) => {
        const { name } = event.target;
        const value = ["storePhone", "pincode"].includes(name)
            ? event.target.value.replace(/\D/g, "")
            : event.target.value;

        setForm((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: "" }));
        setError("");
    };

    const handleLogo = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            !file.size ||
            file.size > 3 * 1024 * 1024
        ) {
            toast.error("Select a valid JPG, PNG or WebP image up to 3 MB.");
            return;
        }

        setLogoFile(file);
        setRemoveLogo(false);
        setFailedLogo("");
        setError("");
    };

    const handleCancel = () => {
        setForm(toForm(store));
        setLogoFile(null);
        setRemoveLogo(false);
        setErrors({});
        setError("");
        setEditing(false);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!editing || saving) return;

        const values = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [key, value.trim()])
        );

        const validationErrors = validate(values);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        const changed =
            JSON.stringify(values) !== JSON.stringify(toForm(store)) ||
            Boolean(logoFile) ||
            (removeLogo && Boolean(store.storeLogo?.url));

        if (!changed) {
            setEditing(false);
            toast.info("No changes to save.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const result = await storeService.updateStoreProfile(
                {
                    ...values,
                    version: store.version,
                    removeLogo,
                },
                logoFile
            );

            setStore(result.store);
            setForm(toForm(result.store));
            setLogoFile(null);
            setRemoveLogo(false);
            setEditing(false);
            setErrors({});
            toast.success(result.message);

            try {
                await refreshUser();
            } catch {
                toast.warning("Store saved. Refresh the page to reload account details.");
            }
        } catch (failure) {
            setError(failure.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="seller-store-profile">
                <p role="status">Loading store profile...</p>
            </main>
        );
    }

    if (!store) {
        return (
            <main className="seller-store-profile">
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" onClick={() => setRevision((value) => value + 1)}>
                            Retry
                        </Button>
                    }
                >
                    {error || "Store profile is unavailable."}
                </Alert>
            </main>
        );
    }

    const logo = preview || (!removeLogo && store.storeLogo?.url) || "";

    const initials = (form.storeName || "Store")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

    const requiredFields = allFields.filter((field) => field.required !== false);
    const completed = requiredFields.filter((field) => form[field.name]?.trim()).length;

    const completion = Math.round(
        ((completed + Number(Boolean(logo))) / (requiredFields.length + 1)) * 100
    );

    return (
        <main className="seller-store-profile">
            <header className="ssp-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-store" aria-hidden="true" />
                        STORE PROFILE
                    </h1>
                    <p>
                        Manage your store information, business contact details and parcel pickup
                        address.
                    </p>
                </div>

                {!editing && (
                    <Button
                        variant="outlined"
                        onClick={() => setEditing(true)}
                        disabled={saving}
                        startIcon={<i className="fa-solid fa-pen" />}
                    >
                        Edit Store
                    </Button>
                )}
            </header>

            {error && (
                <Alert
                    severity="error"
                    action={
                        <Button
                            color="inherit"
                            disabled={saving}
                            onClick={() => {
                                if (
                                    window.confirm(
                                        "Reload saved details? Unsaved changes will be discarded."
                                    )
                                ) {
                                    setRevision((value) => value + 1);
                                }
                            }}
                        >
                            Reload
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            <section className="ssp-overview">
                <div className="ssp-brand">
                    <div className="ssp-logo-frame">
                        {logo && failedLogo !== logo ? (
                            <img
                                src={logo}
                                alt={`${form.storeName} logo`}
                                onError={() => setFailedLogo(logo)}
                            />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>

                    <div className="ssp-brand-details">
                        <small>STORE IDENTITY</small>
                        <h2>{form.storeName || "Store Name"}</h2>
                        <p>Seller Profile ID: {store._id}</p>

                        {editing && (
                            <div className="ssp-logo-actions">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={saving}
                                    onClick={() => fileRef.current?.click()}
                                    startIcon={<i className="fa-solid fa-image" />}
                                >
                                    {logo ? "Change Logo" : "Upload Logo"}
                                </Button>

                                {logo && (
                                    <Button
                                        size="small"
                                        color="error"
                                        disabled={saving}
                                        onClick={() => {
                                            setLogoFile(null);
                                            setRemoveLogo(true);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={handleLogo}
                            aria-label="Upload store logo"
                            disabled={!editing || saving}
                            hidden
                        />
                    </div>
                </div>

                <div className="ssp-overview-side">
                    <span className={`ssp-status is-${store.status.toLowerCase()}`}>
                        <i className="fa-solid fa-circle" aria-hidden="true" />
                        {store.status}
                    </span>

                    <div className="ssp-completion">
                        <div>
                            <span>Profile Completeness</span>
                            <strong>{completion}%</strong>
                        </div>
                        <progress
                            value={completion}
                            max="100"
                            aria-label="Store profile completeness"
                        />
                        <small>Logo: JPG, PNG or WebP · Max 3 MB</small>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSave} noValidate>
                <div className="ssp-grid">
                    <section className="ssp-card">
                        <div className="ssp-card-head">
                            <span>
                                <i className="fa-solid fa-shop" aria-hidden="true" />
                            </span>
                            <div>
                                <h2>Store Information</h2>
                                <p>Storefront and customer contact details.</p>
                            </div>
                        </div>

                        <div className="ssp-fields">
                            {storeFields.map((item) => (
                                <StoreField
                                    key={item.name}
                                    item={item}
                                    form={form}
                                    errors={errors}
                                    editing={editing && !saving}
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="ssp-card">
                        <div className="ssp-card-head">
                            <span>
                                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                            </span>
                            <div>
                                <h2>Pickup Address</h2>
                                <p>Location used for delivery agent pickups.</p>
                            </div>
                        </div>

                        <div className="ssp-fields">
                            {pickupFields.map((item) => (
                                <StoreField
                                    key={item.name}
                                    item={item}
                                    form={form}
                                    errors={errors}
                                    editing={editing && !saving}
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                <div className="ssp-footer">
                    <p>
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        Store contact details are separate from your account login details.
                    </p>

                    <div className="ssp-footer-actions">
                        {editing ? (
                            <>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    disabled={saving}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={saving}
                                    startIcon={<i className="fa-solid fa-floppy-disk" />}
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        ) : (
                            <Link to="/manage/approval-status">
                                View Approval Status
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                </div>
            </form>
        </main>
    );
}

export default StoreProfile;
