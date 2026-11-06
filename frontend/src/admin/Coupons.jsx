
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import { sortNewestFirst } from "../utils/sortNewestFirst";

// ================== COUPON CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_coupons";

const scopes = [
    "All Categories",
    "Electronics",
    "Fashion",
    "Groceries",
    "Health & Beauty",
    "Home & Living",
    "Travel Essentials",
];

function dateAfter(days) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

const initialCoupons = [
    { code: "WELCOME10", name: "Welcome Offer", type: "Percentage", value: 10, cap: 200, minimum: 499, limit: 500, perCustomer: 1, used: 124, scope: "All Categories", start: -30, end: 30, enabled: true },
    { code: "ZUPITO200", name: "Shopping Savings", type: "Fixed", value: 200, cap: 0, minimum: 1499, limit: 300, perCustomer: 2, used: 78, scope: "All Categories", start: -25, end: 20, enabled: true },
    { code: "FASHION15", name: "Fashion Deals", type: "Percentage", value: 15, cap: 400, minimum: 999, limit: 150, perCustomer: 1, used: 31, scope: "Fashion", start: -20, end: 25, enabled: true },
    { code: "GROCERY50", name: "Grocery Savings", type: "Fixed", value: 50, cap: 0, minimum: 399, limit: 100, perCustomer: 1, used: 86, scope: "Groceries", start: -18, end: 12, enabled: true },
    { code: "ELEC5", name: "Electronics Offer", type: "Percentage", value: 5, cap: 500, minimum: 2999, limit: 80, perCustomer: 1, used: 11, scope: "Electronics", start: -12, end: 28, enabled: true },
    { code: "SAVE100", name: "Limited Savings", type: "Fixed", value: 100, cap: 0, minimum: 799, limit: 120, perCustomer: 1, used: 120, scope: "All Categories", start: -25, end: 10, enabled: true },
    { code: "TRAVEL20", name: "Travel Collection Offer", type: "Percentage", value: 20, cap: 600, minimum: 1599, limit: 100, perCustomer: 1, used: 0, scope: "Travel Essentials", start: 5, end: 35, enabled: true },
    { code: "WEEKEND10", name: "Weekend Specials", type: "Percentage", value: 10, cap: 200, minimum: 599, limit: 200, perCustomer: 2, used: 23, scope: "All Categories", start: -5, end: 20, enabled: false },
    { code: "OLDDEAL", name: "Previous Campaign", type: "Fixed", value: 150, cap: 0, minimum: 999, limit: 100, perCustomer: 1, used: 94, scope: "All Categories", start: -70, end: -7, enabled: true },
    { code: "HOME5", name: "Home Essentials Offer", type: "Percentage", value: 5, cap: 150, minimum: 499, limit: 100, perCustomer: 1, used: 15, scope: "Home & Living", start: -3, end: 18, enabled: true },
].map((coupon, index) => ({
    id: `ZC${1001 + index}`,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    value: coupon.value,
    maxDiscount: coupon.cap,
    minOrder: coupon.minimum,
    usageLimit: coupon.limit,
    perCustomerLimit: coupon.perCustomer,
    usageCount: coupon.used,
    scope: coupon.scope,
    validFrom: dateAfter(coupon.start),
    validUntil: dateAfter(coupon.end),
    enabled: coupon.enabled,
    description: "",
    createdAt: new Date(Date.now() - (9 - index) * 86400000).toISOString(),
    updatedAt: null,
    history: [],
}));

const createEmptyForm = () => ({
    name: "",
    code: "",
    description: "",
    type: "Percentage",
    value: "",
    maxDiscount: "",
    minOrder: "0",
    scope: "All Categories",
    usageLimit: "100",
    perCustomerLimit: "1",
    validFrom: dateAfter(0),
    validUntil: dateAfter(30),
});

// ================== HELPERS ==================
function loadCoupons() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved)) return saved;
    } catch {
        // Use initial preview records.
    }

    return initialCoupons;
}

function getCouponStatus(coupon) {
    const today = dateAfter(0);

    if (coupon.validUntil < today) return "Expired";
    if (Number(coupon.usageCount) >= Number(coupon.usageLimit)) return "Exhausted";
    if (!coupon.enabled) return "Paused";
    if (coupon.validFrom > today) return "Scheduled";

    return "Active";
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const parts = String(value).split("-");

    if (parts.length !== 3) return value;

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDiscount(coupon) {
    return coupon.type === "Percentage"
        ? `${coupon.value}% OFF`
        : `${formatMoney(coupon.value)} OFF`;
}

function CouponBadge({ value }) {
    const theme = {
        Active: "success",
        Scheduled: "blue",
        Paused: "neutral",
        Exhausted: "warning",
        Expired: "danger",
    }[value] || "neutral";

    return (
        <span className={`mc-badge mc-badge--${theme}`}>
            <span className="mc-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="mc-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== COUPON MANAGEMENT ==================
function Coupons() {
    const [coupons, setCoupons] = useState(loadCoupons);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== ADD / EDIT ==================
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(createEmptyForm);
    const [formError, setFormError] = useState("");

    // ================== DETAILS / STATUS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [actionReason, setActionReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedCoupon = coupons.find((coupon) => coupon.id === selectedId);
    const editingCoupon = coupons.find((coupon) => coupon.id === editingId);
    const actionCoupon = coupons.find((coupon) => coupon.id === statusAction?.id);

    // ================== SAVE RECORDS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
        } catch {
            // Continue with current React state.
        }
    }, [coupons]);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Coupons",
            value: coupons.length,
            description: "Created promotional campaigns",
            theme: "blue",
            icon: "fa-ticket",
        },
        {
            label: "Active Coupons",
            value: coupons.filter((coupon) => getCouponStatus(coupon) === "Active").length,
            description: "Currently eligible for use",
            theme: "green",
            icon: "fa-circle-check",
        },
        {
            label: "Scheduled Coupons",
            value: coupons.filter((coupon) => getCouponStatus(coupon) === "Scheduled").length,
            description: "Campaigns starting later",
            theme: "orange",
            icon: "fa-calendar-days",
        },
        {
            label: "Inactive Coupons",
            value: coupons.filter((coupon) =>
                ["Paused", "Expired", "Exhausted"].includes(getCouponStatus(coupon))
            ).length,
            description: "Paused, expired or exhausted",
            theme: "red",
            icon: "fa-ban",
        },
    ];

    // ================== FILTERED COUPONS ==================
    const filteredCoupons = sortNewestFirst(
        coupons.filter((coupon) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                coupon.name,
                coupon.code,
                coupon.scope,
                coupon.description,
                coupon.id,
            ].some((value) => String(value || "").toLowerCase().includes(query));

            return matchesSearch &&
                (statusFilter === "All" || getCouponStatus(coupon) === statusFilter) &&
                (typeFilter === "All" || coupon.type === typeFilter);
        }),
        "createdAt"
    );

    const visibleCoupons = filteredCoupons.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        typeFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setTypeFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setCoupons(loadCoupons());
        setPage(0);
        toast.info("Coupon records refreshed.");
    };

    // ================== ADD / EDIT FORM ==================
    const openForm = (coupon = null) => {
        setSelectedId(null);
        setEditingId(coupon?.id || null);

        setForm(coupon ? {
            name: coupon.name,
            code: coupon.code,
            description: coupon.description || "",
            type: coupon.type,
            value: String(coupon.value),
            maxDiscount: coupon.type === "Percentage"
                ? String(coupon.maxDiscount) : "",
            minOrder: String(coupon.minOrder),
            scope: coupon.scope,
            usageLimit: String(coupon.usageLimit),
            perCustomerLimit: String(coupon.perCustomerLimit),
            validFrom: coupon.validFrom,
            validUntil: coupon.validUntil,
        } : createEmptyForm());

        setFormError("");
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(createEmptyForm());
        setFormError("");
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: name === "code" ? value.toUpperCase() : value,
            ...(name === "type" ? { maxDiscount: "" } : {}),
        }));

        setFormError("");
    };

    const handleSave = (event) => {
        event.preventDefault();

        const name = form.name.trim();
        const code = form.code.trim().toUpperCase();
        const description = form.description.trim();
        const discount = Number(form.value);
        const cap = Number(form.maxDiscount);
        const minOrder = Number(form.minOrder);
        const usageLimit = Number(form.usageLimit);
        const perCustomerLimit = Number(form.perCustomerLimit);

        if (name.length < 3 || name.length > 80) {
            setFormError("Campaign name must contain 3–80 characters.");
            return;
        }

        if (!/^[A-Z0-9][A-Z0-9_-]{3,19}$/.test(code)) {
            setFormError("Coupon code must contain 4–20 uppercase letters, numbers, _ or -.");
            return;
        }

        if (coupons.some((coupon) =>
            coupon.code === code && coupon.id !== editingId
        )) {
            setFormError("This coupon code already exists.");
            return;
        }

        if (!form.value.trim() || !Number.isFinite(discount) || discount <= 0) {
            setFormError("Enter a valid discount amount greater than zero.");
            return;
        }

        if (form.type === "Percentage" && discount > 100) {
            setFormError("Percentage discount cannot exceed 100%.");
            return;
        }

        if (form.type === "Percentage" &&
            (!form.maxDiscount.trim() || !Number.isFinite(cap) || cap <= 0)) {
            setFormError("Enter a valid maximum discount amount.");
            return;
        }

        if (!Number.isFinite(minOrder) || minOrder < 0) {
            setFormError("Minimum order value cannot be negative.");
            return;
        }

        if (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 100000) {
            setFormError("Total usage limit must be between 1 and 100,000.");
            return;
        }

        if (!Number.isInteger(perCustomerLimit) ||
            perCustomerLimit < 1 || perCustomerLimit > usageLimit) {
            setFormError("Per-customer limit must be between 1 and the total usage limit.");
            return;
        }

        if (editingCoupon && usageLimit < Number(editingCoupon.usageCount)) {
            setFormError("Usage limit cannot be lower than existing redemptions.");
            return;
        }

        if (!scopes.includes(form.scope)) {
            setFormError("Select a valid category scope.");
            return;
        }

        if (!form.validFrom || !form.validUntil ||
            form.validFrom > form.validUntil) {
            setFormError("End date must be on or after the start date.");
            return;
        }

        if (form.validUntil < dateAfter(0) &&
            (!editingCoupon || form.validUntil !== editingCoupon.validUntil)) {
            setFormError("New validity end date cannot be in the past.");
            return;
        }

        if (editingId && !editingCoupon) {
            setFormError("Coupon record was not found.");
            return;
        }

        const details = {
            name,
            code,
            description,
            type: form.type,
            value: discount,
            maxDiscount: form.type === "Percentage" ? cap : 0,
            minOrder,
            scope: form.scope,
            usageLimit,
            perCustomerLimit,
            validFrom: form.validFrom,
            validUntil: form.validUntil,
        };

        const now = new Date().toISOString();

        if (editingId) {
            setCoupons((previous) => previous.map((coupon) =>
                coupon.id === editingId
                    ? {
                          ...coupon,
                          ...details,
                          updatedAt: now,
                          history: [
                              ...(coupon.history || []),
                              {
                                  action: "Updated",
                                  date: now,
                                  note: "Coupon configuration updated by Admin.",
                              },
                          ],
                      }
                    : coupon
            ));

            toast.success("Coupon updated successfully.");
        } else {
            setCoupons((previous) => [
                ...previous,
                {
                    id: `ZC-${crypto.randomUUID()}`,
                    ...details,
                    enabled: true,
                    usageCount: 0,
                    createdAt: now,
                    updatedAt: null,
                    history: [],
                },
            ]);

            toast.success("Coupon created successfully.");
        }

        setPage(0);
        closeForm();
    };

    // ================== PAUSE / ACTIVATE ==================
    const openStatusAction = (coupon) => {
        setSelectedId(null);
        setStatusAction({
            id: coupon.id,
            type: coupon.enabled ? "pause" : "activate",
        });
        setActionReason("");
        setActionError("");
    };

    const closeStatusAction = () => {
        setStatusAction(null);
        setActionReason("");
        setActionError("");
    };

    const handleStatusUpdate = () => {
        if (!actionCoupon) {
            closeStatusAction();
            return;
        }

        if (statusAction.type === "pause" && !actionCoupon.enabled) {
            setActionError("Coupon is already paused.");
            return;
        }

        if (statusAction.type === "activate") {
            if (actionCoupon.enabled) {
                setActionError("Coupon is already enabled.");
                return;
            }

            if (actionCoupon.validUntil < dateAfter(0)) {
                setActionError("Extend the validity date before activating.");
                return;
            }

            if (actionCoupon.usageCount >= actionCoupon.usageLimit) {
                setActionError("Increase the usage limit before activating.");
                return;
            }
        }

        if (statusAction.type === "pause" &&
            actionReason.trim().length < 5) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        const enabled = statusAction.type === "activate";
        const now = new Date().toISOString();

        setCoupons((previous) => previous.map((coupon) =>
            coupon.id === statusAction.id
                ? {
                      ...coupon,
                      enabled,
                      updatedAt: now,
                      history: [
                          ...(coupon.history || []),
                          {
                              action: enabled ? "Activated" : "Paused",
                              date: now,
                              note: enabled
                                  ? "Coupon activated by Admin."
                                  : actionReason.trim(),
                          },
                      ],
                  }
                : coupon
        ));

        toast.success(enabled ? "Coupon activated successfully." : "Coupon paused successfully.");
        closeStatusAction();
    };

    return (
        <div className="manage-coupons">
            {/* ================== PAGE HEADER ================== */}
            <section className="mc-hero">
                <div className="mc-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-ticket" aria-hidden="true" />
                        COUPON MANAGEMENT
                    </span>

                    <p>
                        Create promotional offers, control discount limits,
                        campaign validity and coupon availability.
                    </p>
                </div>

                <div className="mc-hero-actions">
                    <Button
                        variant="outlined"
                        onClick={handleRefresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => showForm ? closeForm() : openForm()}
                        startIcon={<i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />}
                    >
                        {showForm ? "Close Form" : "Add Coupon"}
                    </Button>
                </div>
            </section>

            {/* ================== ADD / EDIT FORM ================== */}
            {showForm && (
                <section className="mc-card">
                    <div className="mc-section-header">
                        <div className="mc-section-heading">
                            <span className="mc-section-icon">
                                <i className="fa-solid fa-pen-to-square" />
                            </span>

                            <div>
                                <h2>{editingId ? "Edit Coupon" : "Add Coupon"}</h2>
                                <p>Configure promotion details, eligibility and redemption limits.</p>
                            </div>
                        </div>
                    </div>

                    <form className="mc-form" onSubmit={handleSave} noValidate>
                        <h3>Campaign Information</h3>

                        <div className="mc-form-grid">
                            <TextField
                                label="Campaign Name"
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 80 } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Coupon Code"
                                name="code"
                                value={form.code}
                                onChange={handleFormChange}
                                disabled={Boolean(editingId)}
                                helperText="Unique code; cannot be changed after creation."
                                slotProps={{ htmlInput: { maxLength: 20 } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Description (Optional)"
                                name="description"
                                value={form.description}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 240 } }}
                                multiline
                                minRows={2}
                                fullWidth
                                className="mc-form-full"
                            />
                        </div>

                        <h3>Discount Configuration</h3>

                        <div className="mc-form-grid">
                            <TextField
                                select
                                label="Discount Type"
                                name="type"
                                value={form.type}
                                onChange={handleFormChange}
                                fullWidth
                            >
                                <MenuItem value="Percentage">Percentage (%)</MenuItem>
                                <MenuItem value="Fixed">Fixed Amount (₹)</MenuItem>
                            </TextField>

                            <TextField
                                label={form.type === "Percentage"
                                    ? "Discount Percentage"
                                    : "Fixed Discount Amount"}
                                name="value"
                                type="number"
                                value={form.value}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Minimum Order Amount"
                                name="minOrder"
                                type="number"
                                value={form.minOrder}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Maximum Discount Amount"
                                name="maxDiscount"
                                type="number"
                                value={form.maxDiscount}
                                onChange={handleFormChange}
                                disabled={form.type !== "Percentage"}
                                helperText={form.type === "Fixed"
                                    ? "Not required for fixed discounts."
                                    : "Maximum rupee discount per redemption."}
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                fullWidth
                            />

                            <TextField
                                select
                                label="Applicable Category"
                                name="scope"
                                value={form.scope}
                                onChange={handleFormChange}
                                className="mc-form-full"
                                fullWidth
                            >
                                {scopes.map((scope) => (
                                    <MenuItem key={scope} value={scope}>{scope}</MenuItem>
                                ))}
                            </TextField>
                        </div>

                        <h3>Validity & Usage Limits</h3>

                        <div className="mc-form-grid">
                            <TextField
                                label="Valid From"
                                name="validFrom"
                                type="date"
                                value={form.validFrom}
                                onChange={handleFormChange}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Valid Until"
                                name="validUntil"
                                type="date"
                                value={form.validUntil}
                                onChange={handleFormChange}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Total Usage Limit"
                                name="usageLimit"
                                type="number"
                                value={form.usageLimit}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 1, max: 100000, step: 1 } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Usage Limit Per Customer"
                                name="perCustomerLimit"
                                type="number"
                                value={form.perCustomerLimit}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                fullWidth
                                required
                            />
                        </div>

                        {formError && (
                            <Alert severity="error" className="mc-form-error">
                                {formError}
                            </Alert>
                        )}

                        <div className="mc-form-footer">
                            <span>
                                <i className="fa-solid fa-circle-info" />
                                Coupon settings are saved in frontend demo storage.
                            </span>

                            <div>
                                <Button color="inherit" variant="outlined" onClick={closeForm}>
                                    Cancel
                                </Button>

                                <Button type="submit" variant="contained">
                                    {editingId ? "Save Changes" : "Create Coupon"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            {/* ================== STATISTICS ================== */}
            <section className="mc-stats">
                {statistics.map((item) => (
                    <article key={item.label} className={`mc-stat mc-stat--${item.theme}`}>
                        <div className="mc-stat-heading">
                            <span>{item.label}</span>

                            <span className="mc-stat-icon">
                                <i className={`fa-solid ${item.icon}`} />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== COUPON LIST ================== */}
            <section className="mc-card">
                <div className="mc-section-header">
                    <div className="mc-section-heading">
                        <span className="mc-section-icon">
                            <i className="fa-solid fa-list-check" />
                        </span>

                        <div>
                            <h2>Promotional Coupons</h2>
                            <p>Manage coupon eligibility, redemptions and campaign status.</p>
                        </div>
                    </div>

                    <span className="mc-record-count">
                        {filteredCoupons.length} Records
                    </span>
                </div>

                {/* ================== FILTERS ================== */}
                <div className="mc-toolbar">
                    <TextField
                        className="mc-search"
                        label="Search Coupons"
                        placeholder="Coupon code, campaign or category"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <i className="fa-solid fa-magnifying-glass" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        fullWidth
                    />

                    <TextField
                        select
                        className="mc-filter"
                        label="Coupon Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        {["Active", "Scheduled", "Paused", "Expired", "Exhausted"].map((status) => (
                            <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="mc-filter"
                        label="Discount Type"
                        value={typeFilter}
                        onChange={(event) => {
                            setTypeFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                    >
                        <MenuItem value="All">All Types</MenuItem>
                        <MenuItem value="Percentage">Percentage</MenuItem>
                        <MenuItem value="Fixed">Fixed Amount</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="mc-reset"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== COUPONS TABLE ================== */}
                <TableContainer className="mc-table-scroll">
                    <Table className="mc-table" aria-label="Promotional coupons">
                        <TableHead>
                            <TableRow>
                                <TableCell>Coupon / Campaign</TableCell>
                                <TableCell>Discount</TableCell>
                                <TableCell>Applicable Category</TableCell>
                                <TableCell>Minimum Order</TableCell>
                                <TableCell>Usage</TableCell>
                                <TableCell>Validity</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleCoupons.map((coupon) => (
                                <TableRow key={coupon.id} hover>
                                    <TableCell>
                                        <div className="mc-coupon">
                                            <span className="mc-coupon-icon">
                                                <i className="fa-solid fa-ticket" />
                                            </span>

                                            <div>
                                                <strong>{coupon.code}</strong>
                                                <small>{coupon.name}</small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mc-cell">
                                            <strong>{formatDiscount(coupon)}</strong>
                                            <small>
                                                {coupon.type === "Percentage"
                                                    ? `Up to ${formatMoney(coupon.maxDiscount)}`
                                                    : "Fixed discount"}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mc-scope">{coupon.scope}</span>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="mc-amount">
                                            {formatMoney(coupon.minOrder)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mc-usage">
                                            <strong>
                                                {coupon.usageCount} / {coupon.usageLimit}
                                            </strong>

                                            <progress
                                                max={coupon.usageLimit}
                                                value={Math.min(coupon.usageCount, coupon.usageLimit)}
                                                aria-label={`${coupon.code} redemption usage`}
                                            />
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mc-cell">
                                            <strong>{formatDate(coupon.validFrom)}</strong>
                                            <small>to {formatDate(coupon.validUntil)}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <CouponBadge value={getCouponStatus(coupon)} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="mc-view"
                                            onClick={() => setSelectedId(coupon.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleCoupons.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="mc-empty">
                                            <i className="fa-solid fa-ticket" />
                                            <h3>No Coupons Found</h3>
                                            <p>Try changing your search or filters.</p>

                                            {hasFilters && (
                                                <Button variant="outlined" onClick={resetFilters}>
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    className="mc-pagination"
                    count={filteredCoupons.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== COUPON DETAILS ================== */}
            <Dialog
                open={Boolean(selectedCoupon)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "mc-dialog" } }}
            >
                {selectedCoupon && (
                    <>
                        <DialogTitle>Coupon Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="mc-detail-banner">
                                <div>
                                    <span>COUPON CODE</span>
                                    <h3>{selectedCoupon.code}</h3>
                                    <p>{selectedCoupon.name}</p>
                                </div>

                                <CouponBadge value={getCouponStatus(selectedCoupon)} />
                            </div>

                            <div className="mc-detail-section">
                                <h4>Discount & Eligibility</h4>

                                <dl className="mc-detail-grid">
                                    <DetailItem label="Discount Type" value={selectedCoupon.type} />
                                    <DetailItem label="Discount Value" value={formatDiscount(selectedCoupon)} />
                                    <DetailItem
                                        label="Maximum Discount"
                                        value={selectedCoupon.type === "Percentage"
                                            ? formatMoney(selectedCoupon.maxDiscount)
                                            : "Not applicable"}
                                    />
                                    <DetailItem label="Minimum Order" value={formatMoney(selectedCoupon.minOrder)} />
                                    <DetailItem label="Applicable Category" value={selectedCoupon.scope} />
                                    <DetailItem label="Coupon Status" value={getCouponStatus(selectedCoupon)} />
                                </dl>
                            </div>

                            <div className="mc-detail-section">
                                <h4>Validity & Usage</h4>

                                <dl className="mc-detail-grid">
                                    <DetailItem label="Valid From" value={formatDate(selectedCoupon.validFrom)} />
                                    <DetailItem label="Valid Until" value={formatDate(selectedCoupon.validUntil)} />
                                    <DetailItem label="Total Usage Limit" value={selectedCoupon.usageLimit} />
                                    <DetailItem label="Used Count" value={selectedCoupon.usageCount} />
                                    <DetailItem
                                        label="Remaining Uses"
                                        value={Math.max(0, selectedCoupon.usageLimit - selectedCoupon.usageCount)}
                                    />
                                    <DetailItem
                                        label="Per-Customer Limit"
                                        value={selectedCoupon.perCustomerLimit}
                                    />
                                </dl>

                                <div className="mc-detail-usage">
                                    <progress
                                        max={selectedCoupon.usageLimit}
                                        value={Math.min(selectedCoupon.usageCount, selectedCoupon.usageLimit)}
                                    />
                                </div>
                            </div>

                            {selectedCoupon.description && (
                                <div className="mc-detail-section">
                                    <h4>Campaign Description</h4>
                                    <p className="mc-description">{selectedCoupon.description}</p>
                                </div>
                            )}

                            {(selectedCoupon.history || []).length > 0 && (
                                <div className="mc-detail-section">
                                    <h4>Administrative History</h4>

                                    <div className="mc-history">
                                        {[...selectedCoupon.history].reverse().map((entry, index) => (
                                            <div key={index}>
                                                <strong>{entry.action}</strong>
                                                <small>{new Date(entry.date).toLocaleString("en-IN")}</small>
                                                <p>{entry.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Alert severity="info" className="mc-dialog-alert">
                                Coupon usage counts are preview data. Real checkout
                                redemption validation and usage tracking will
                                be implemented in the backend.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="mc-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            <Button variant="outlined" onClick={() => openForm(selectedCoupon)}>
                                Edit Coupon
                            </Button>

                            {selectedCoupon.enabled &&
                                ["Active", "Scheduled"].includes(getCouponStatus(selectedCoupon)) && (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={() => openStatusAction(selectedCoupon)}
                                    >
                                        Pause Coupon
                                    </Button>
                                )}

                            {!selectedCoupon.enabled && (
                                <Button
                                    variant="contained"
                                    onClick={() => openStatusAction(selectedCoupon)}
                                >
                                    Activate
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(statusAction)}
                onClose={closeStatusAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "mc-dialog" } }}
            >
                <DialogTitle>
                    {statusAction?.type === "pause"
                        ? "Pause Coupon"
                        : "Activate Coupon"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="mc-confirm-text">
                        Coupon: <strong>{actionCoupon?.code}</strong>
                    </p>

                    {statusAction?.type === "pause" ? (
                        <>
                            <Alert severity="warning" className="mc-dialog-alert">
                                New coupon redemptions will be blocked.
                                Previous orders will remain unchanged.
                            </Alert>

                            <TextField
                                label="Reason for Pausing"
                                value={actionReason}
                                onChange={(event) => {
                                    setActionReason(event.target.value);
                                    setActionError("");
                                }}
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </>
                    ) : (
                        <Alert severity="info" className="mc-dialog-alert">
                            Activation enables the coupon subject to its validity
                            dates and remaining usage limit.
                        </Alert>
                    )}

                    {actionError && (
                        <Alert severity="error" className="mc-dialog-alert">
                            {actionError}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions className="mc-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={statusAction?.type === "pause" ? "warning" : "primary"}
                        onClick={handleStatusUpdate}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Coupons;
