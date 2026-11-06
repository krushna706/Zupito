
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

// ================== STORE CONFIGURATION ==================
const PROFILE_KEY = "zupito_seller_store_profiles";
const ADMIN_KEY = "zupito_admin_sellers";

const storeFields = [
    { name: "storeName", label: "Store Name", max: 100, wide: true },
    { name: "storeEmail", label: "Store Email", max: 254 },
    { name: "storePhone", label: "Contact Number", max: 10, numeric: true },
    { name: "description", label: "Store Description", max: 500, wide: true, multiline: true, required: false },
];

const pickupFields = [
    { name: "address", label: "Pickup Address", max: 200, wide: true },
    { name: "locality", label: "Locality / Area", max: 100 },
    { name: "city", label: "City", max: 80 },
    { name: "state", label: "State", max: 80 },
    { name: "pincode", label: "Pincode", max: 6, numeric: true },
    { name: "pickupNotes", label: "Pickup Instructions (Optional)", max: 200, wide: true, multiline: true, required: false },
];

const allFields = [...storeFields, ...pickupFields];
const completionFields = [
    "storeLogo",
    ...allFields.filter((item) => item.name !== "pickupNotes").map((item) => item.name),
];

// ================== STORAGE HELPERS ==================
function readStorage(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

const accountKey = (user) => String(user?.id || user?.email || "seller-demo").toLowerCase();

function findSeller(user) {
    const sellers = readStorage(ADMIN_KEY, []);

    if (!Array.isArray(sellers)) return null;

    return sellers.find((seller) =>
        (user?.email && seller.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.phone && String(seller.mobile) === String(user.phone))
    ) || null;
}

function loadProfile(user) {
    const seller = findSeller(user);
    const profiles = readStorage(PROFILE_KEY, {});
    const stored = profiles && !Array.isArray(profiles) ? profiles[accountKey(user)] : null;

    const profile = {
        storeLogo: "",
        storeName: "Zupito Seller Store",
        storeEmail: user?.email || "",
        storePhone: user?.phone || "",
    };

    allFields.forEach(({ name }) => {
        profile[name] ??= "";
        if (typeof seller?.[name] === "string") {
            profile[name] = seller[name];
        }
    });

    if (typeof seller?.storeLogo === "string") {
        profile.storeLogo = seller.storeLogo;
    }

    return {
        ...profile,
        ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
    };
}

// ================== VALIDATION ==================
function validate(form) {
    const errors = {};

    if (form.storeName.length < 3) {
        errors.storeName = "Enter at least 3 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.storeEmail)) {
        errors.storeEmail = "Enter a valid email address.";
    }

    if (!/^[6-9]\d{9}$/.test(form.storePhone)) {
        errors.storePhone = "Enter a valid 10-digit mobile number.";
    }

    if (form.address.length < 5) {
        errors.address = "Enter a complete pickup address.";
    }

    for (const name of ["locality", "city", "state"]) {
        if (form[name].length < 2) {
            errors[name] = "At least 2 characters required.";
        }
    }

    if (!/^[1-9]\d{5}$/.test(form.pincode)) {
        errors.pincode = "Enter a valid 6-digit pincode.";
    }

    return errors;
}

// ================== STORE LOGO ==================
function optimizeLogo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Unable to read the selected image."));

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => reject(new Error("Invalid image file."));

            image.onload = () => {
                try {
                    const ratio = Math.min(1, 480 / Math.max(image.width, image.height));
                    const canvas = document.createElement("canvas");

                    canvas.width = Math.max(1, Math.round(image.width * ratio));
                    canvas.height = Math.max(1, Math.round(image.height * ratio));

                    const context = canvas.getContext("2d");

                    if (!context) throw new Error("Image processing is unavailable.");

                    context.drawImage(image, 0, 0, canvas.width, canvas.height);

                    const result = canvas.toDataURL("image/webp", 0.8);

                    if (result.length > 600000) {
                        throw new Error("Logo is too large for browser storage.");
                    }

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            image.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// ================== FORM FIELD ==================
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

// ================== STORE PROFILE ==================
function StoreProfile({ user }) {
    const [form, setForm] = useState(() => loadProfile(user));
    const [saved, setSaved] = useState(() => loadProfile(user));
    const [seller, setSeller] = useState(() => findSeller(user));
    const [editing, setEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});

    const fileRef = useRef(null);

    useEffect(() => {
        if (editing) return;

        const sync = () => {
            const profile = loadProfile(user);
            setSaved(profile);
            setForm(profile);
            setSeller(findSeller(user));
        };

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user, editing]);

    // ================== FORM HANDLING ==================
    const handleChange = (event) => {
        const { name } = event.target;

        const value = ["storePhone", "pincode"].includes(name)
            ? event.target.value.replace(/\D/g, "")
            : event.target.value;

        setForm((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: "" }));
    };

    const handleLogo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 3 * 1024 * 1024
        ) {
            toast.error("Select a JPG, PNG or WebP image up to 3 MB.");
            return;
        }

        setUploading(true);

        try {
            const storeLogo = await optimizeLogo(file);
            setForm((previous) => ({ ...previous, storeLogo }));
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setForm(saved);
        setErrors({});
        setEditing(false);
    };

    const handleSave = (event) => {
        event.preventDefault();

        if (!editing || uploading) return;

        const next = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [
                key,
                typeof value === "string" && key !== "storeLogo"
                    ? value.trim()
                    : value,
            ])
        );

        const validationErrors = validate(next);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please correct the highlighted fields.");
            return;
        }

        if (JSON.stringify(next) === JSON.stringify(saved)) {
            setEditing(false);
            toast.info("No changes to save.");
            return;
        }

        try {
            const profiles = readStorage(PROFILE_KEY, {});

            localStorage.setItem(
                PROFILE_KEY,
                JSON.stringify({
                    ...(profiles && typeof profiles === "object" && !Array.isArray(profiles)
                        ? profiles
                        : {}),
                    [accountKey(user)]: next,
                })
            );

            // Keep matching Admin demo store details updated.
            const sellers = readStorage(ADMIN_KEY, []);

            if (seller && Array.isArray(sellers)) {
                const updates = Object.fromEntries(
                    [...allFields.map((item) => item.name), "storeLogo"]
                        .map((name) => [name, next[name]])
                );

                try {
                    localStorage.setItem(
                        ADMIN_KEY,
                        JSON.stringify(
                            sellers.map((item) =>
                                item.id === seller.id
                                    ? { ...item, ...updates }
                                    : item
                            )
                        )
                    );
                } catch {
                    toast.warning("Profile saved, but Admin demo synchronization was unavailable.");
                }
            }

            setSaved(next);
            setForm(next);
            setSeller(findSeller(user));
            setEditing(false);
            setErrors({});

            toast.success("Store profile saved successfully.");
        } catch {
            toast.error("Unable to save. Browser storage may be full.");
        }
    };

    const completed = completionFields.filter((name) =>
        String(form[name] || "").trim()
    ).length;

    const completion = Math.round(completed / completionFields.length * 100);

    const initials = (form.storeName || "Store")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase();

    const currentStatus = seller?.status || "Demo Preview";

    return (
        <main className="seller-store-profile">
            {/* ================== PAGE HEADER ================== */}
            <header className="ssp-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-store" aria-hidden="true" />
                        STORE PROFILE
                    </h1>
                    <p>
                        Manage your store information, business contact details
                        and parcel pickup address.
                    </p>
                </div>

                {!editing && (
                    <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setEditing(true)}
                        startIcon={
                            <i className="fa-solid fa-pen" aria-hidden="true" />
                        }
                    >
                        Edit Store
                    </Button>
                )}
            </header>

            {/* ================== STORE IDENTITY ================== */}
            <section className="ssp-overview">
                <div className="ssp-brand">
                    <div className="ssp-logo-frame">
                        {form.storeLogo ? (
                            <img
                                src={form.storeLogo}
                                alt={`${form.storeName} logo`}
                            />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>

                    <div className="ssp-brand-details">
                        <small>STORE IDENTITY</small>
                        <h2>{form.storeName || "Store Name"}</h2>

                        <p>
                            {seller?.id
                                ? `Seller ID: ${seller.id}`
                                : "Seller profile · Frontend preview"}
                        </p>

                        {editing && (
                            <div className="ssp-logo-actions">
                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="small"
                                    disabled={uploading}
                                    onClick={() => fileRef.current?.click()}
                                    startIcon={
                                        <i className="fa-solid fa-image" aria-hidden="true" />
                                    }
                                >
                                    {uploading
                                        ? "Processing..."
                                        : form.storeLogo
                                            ? "Change Logo"
                                            : "Upload Logo"}
                                </Button>

                                {form.storeLogo && (
                                    <Button
                                        type="button"
                                        size="small"
                                        color="error"
                                        disabled={uploading}
                                        onClick={() =>
                                            setForm((previous) => ({
                                                ...previous,
                                                storeLogo: "",
                                            }))
                                        }
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleLogo}
                            aria-label="Upload store logo"
                            hidden
                        />
                    </div>
                </div>

                <div className="ssp-overview-side">
                    <span className={`ssp-status is-${String(currentStatus).toLowerCase().replace(/\s+/g, "-")}`}>
                        <i className="fa-solid fa-circle" aria-hidden="true" />
                        {currentStatus}
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

            {/* ================== STORE DETAILS ================== */}
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
                                    editing={editing}
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
                                    editing={editing}
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                {/* ================== FORM ACTIONS ================== */}
                <div className="ssp-footer">
                    <p>
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        Frontend preview · Changes are saved in this browser.
                    </p>

                    <div className="ssp-footer-actions">
                        {editing ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="inherit"
                                    disabled={uploading}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={uploading}
                                    startIcon={
                                        <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                                    }
                                >
                                    Save Changes
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
