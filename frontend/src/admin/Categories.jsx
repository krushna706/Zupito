
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

import { productCatalog } from "../data/productCatalog";

// ================== CATEGORY CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_categories";

const mainCategories = [
    { slug: "electronics", name: "Electronics", icon: "fa-laptop" },
    { slug: "fashion", name: "Fashion", icon: "fa-shirt" },
    { slug: "grocery", name: "Groceries", icon: "fa-basket-shopping" },
    { slug: "health-beauty", name: "Health & Beauty", icon: "fa-heart" },
    { slug: "home-living", name: "Home & Living", icon: "fa-house" },
    { slug: "travel", name: "Travel Essentials", icon: "fa-suitcase-rolling" },
];

const subCategories = [
    { slug: "mobiles", name: "Mobiles", parentId: "electronics", attributes: ["Brand", "Model", "Colour", "Storage"], replacementAllowed: true },
    { slug: "laptops", name: "Laptops", parentId: "electronics", attributes: ["Brand", "Processor", "RAM", "Storage"], replacementAllowed: true },
    { slug: "headphones", name: "Headphones", parentId: "electronics", attributes: ["Brand", "Colour", "Connectivity"], replacementAllowed: true },
    { slug: "mens-wear", name: "Men's Wear", parentId: "fashion", attributes: ["Brand", "Size", "Colour", "Material"], replacementAllowed: true },
    { slug: "womens-wear", name: "Women's Wear", parentId: "fashion", attributes: ["Brand", "Size", "Colour", "Material"], replacementAllowed: true },
    { slug: "kids-wear", name: "Kids' Wear", parentId: "fashion", attributes: ["Age Group", "Size", "Colour"], replacementAllowed: true },
    { slug: "footwear", name: "Footwear", parentId: "fashion", attributes: ["Brand", "Size", "Colour"], replacementAllowed: true },
    { slug: "watches", name: "Watches", parentId: "fashion", attributes: ["Brand", "Dial", "Strap"], replacementAllowed: true },
    { slug: "personal-care", name: "Personal Care", parentId: "health-beauty", attributes: ["Brand", "Pack Size", "Skin Type"], replacementAllowed: false },
    { slug: "daily-essentials", name: "Daily Essentials", parentId: "grocery", attributes: ["Brand", "Pack Size", "Weight"], replacementAllowed: false },
    { slug: "snacks-drinks", name: "Snacks & Drinks", parentId: "grocery", attributes: ["Brand", "Flavour", "Weight"], replacementAllowed: false },
    { slug: "beauty", name: "Beauty", parentId: "health-beauty", attributes: ["Brand", "Shade", "Pack Size"], replacementAllowed: false },
    { slug: "home-kitchen", name: "Home & Kitchen", parentId: "home-living", attributes: ["Brand", "Material", "Dimensions"], replacementAllowed: true },
    { slug: "backpacks", name: "Backpacks", parentId: "travel", attributes: ["Brand", "Capacity", "Material"], replacementAllowed: true },
    { slug: "trolley-bags", name: "Trolley Bags", parentId: "travel", attributes: ["Brand", "Size", "Material"], replacementAllowed: true },
    { slug: "travel-accessories", name: "Travel Accessories", parentId: "travel", attributes: ["Brand", "Material", "Pack Size"], replacementAllowed: true },
];

const initialCategories = [
    ...mainCategories.map((category, index) => ({
        ...category,
        parentId: null,
        description: "",
        sortOrder: index + 1,
        attributes: [],
        replacementAllowed: null,
        replacementDays: 0,
        status: "Active",
    })),
    ...subCategories.map((category, index) => ({
        ...category,
        description: "",
        sortOrder: index + 1,
        replacementDays: category.replacementAllowed ? 7 : 0,
        status: "Active",
    })),
];

const emptyForm = {
    name: "",
    type: "Subcategory",
    parentId: "",
    description: "",
    sortOrder: "1",
    attributes: "",
    replacementAllowed: "Yes",
    replacementDays: "7",
};

// ================== HELPERS ==================
function loadCategories() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved)) return saved;
    } catch {
        // Use initial preview records.
    }

    return initialCategories;
}

function createSlug(name) {
    return name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function CategoryBadge({ status }) {
    const theme = status === "Active" ? "success"
        : status === "Parent Disabled" ? "warning"
        : "danger";

    return (
        <span className={`zc-badge zc-badge--${theme}`}>
            <span className="zc-badge-dot" />
            {status}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="zc-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== CATEGORY MANAGEMENT ==================
function Categories() {
    const [categories, setCategories] = useState(loadCategories);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== FORM ==================
    const [showForm, setShowForm] = useState(false);
    const [editingSlug, setEditingSlug] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");

    // ================== DETAILS AND STATUS ==================
    const [selectedSlug, setSelectedSlug] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedCategory = categories.find((item) => item.slug === selectedSlug);
    const editingCategory = categories.find((item) => item.slug === editingSlug);
    const actionCategory = categories.find((item) => item.slug === statusAction?.slug);

    const parents = categories.filter((item) => !item.parentId);

    // ================== LOCAL STORAGE ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
        } catch {
            // Continue with current React state.
        }
    }, [categories]);

    // ================== CATEGORY HELPERS ==================
    const getParent = (category) =>
        categories.find((item) => item.slug === category.parentId);

    const getChildren = (category) =>
        categories.filter((item) => item.parentId === category.slug);

    const getStatus = (category) => {
        if (category.status === "Disabled") return "Disabled";

        const parent = getParent(category);

        return parent?.status === "Disabled" ? "Parent Disabled" : "Active";
    };

    const getProductCount = (category) => {
        const slugs = category.parentId
            ? [category.slug]
            : getChildren(category).map((item) => item.slug);

        return productCatalog.filter((product) =>
            slugs.includes(product.category)
        ).length;
    };

    const getIcon = (category) => {
        const parent = category.parentId ? getParent(category) : category;
        const saved = mainCategories.find((item) => item.slug === parent?.slug);

        return saved?.icon || "fa-tags";
    };

    // ================== STATISTICS ==================
    const statistics = [
        { label: "Total Categories", value: categories.length, description: "Main categories and subcategories", theme: "blue", icon: "fa-layer-group" },
        { label: "Main Categories", value: parents.length, description: "Top-level departments", theme: "green", icon: "fa-folder-tree" },
        { label: "Subcategories", value: categories.length - parents.length, description: "Product classification groups", theme: "orange", icon: "fa-tags" },
        { label: "Disabled Categories", value: categories.filter((item) => getStatus(item) !== "Active").length, description: "Not available for new listings", theme: "red", icon: "fa-ban" },
    ];

    // ================== SEARCH RESULTS ==================
    const filteredCategories = categories
        .filter((category) => {
            const query = search.trim().toLowerCase();
            const parentName = getParent(category)?.name || "";

            const matchesSearch = [
                category.name,
                category.slug,
                parentName,
                ...(category.attributes || []),
            ].some((value) => String(value).toLowerCase().includes(query));

            const matchesType = typeFilter === "All" ||
                (typeFilter === "Main" ? !category.parentId : Boolean(category.parentId));

            const matchesStatus = statusFilter === "All" ||
                (statusFilter === "Active"
                    ? getStatus(category) === "Active"
                    : getStatus(category) !== "Active");

            return matchesSearch && matchesType && matchesStatus;
        })
        .sort((a, b) => {
            const groupA = a.parentId ? getParent(a)?.name || "" : a.name;
            const groupB = b.parentId ? getParent(b)?.name || "" : b.name;

            return groupA.localeCompare(groupB) ||
                Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)) ||
                a.sortOrder - b.sortOrder ||
                a.name.localeCompare(b.name);
        });

    const visibleCategories = filteredCategories.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        typeFilter !== "All" ||
        statusFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setTypeFilter("All");
        setStatusFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setCategories(loadCategories());
        setPage(0);
        toast.info("Category records refreshed.");
    };

    // ================== CATEGORY FORM ==================
    const openForm = (category = null) => {
        setSelectedSlug(null);
        setEditingSlug(category?.slug || null);

        setForm(category ? {
            name: category.name,
            type: category.parentId ? "Subcategory" : "Main",
            parentId: category.parentId || "",
            description: category.description || "",
            sortOrder: String(category.sortOrder),
            attributes: (category.attributes || []).join(", "),
            replacementAllowed: category.replacementAllowed ? "Yes" : "No",
            replacementDays: String(category.replacementDays || 7),
        } : { ...emptyForm });

        setFormError("");
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingSlug(null);
        setForm({ ...emptyForm });
        setFormError("");
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
            ...(name === "type" ? { parentId: "" } : {}),
        }));

        setFormError("");
    };

    const handleSave = (event) => {
        event.preventDefault();

        const name = form.name.trim();
        const slug = editingSlug || createSlug(name);
        const parentId = form.type === "Subcategory" ? form.parentId : null;
        const sortOrder = Number(form.sortOrder);
        const description = form.description.trim();

        const attributes = form.type === "Subcategory"
            ? [...new Map(
                form.attributes
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item) => [item.toLowerCase(), item])
            ).values()]
            : [];

        const replacementAllowed = form.type === "Subcategory" &&
            form.replacementAllowed === "Yes";

        const replacementDays = replacementAllowed
            ? Number(form.replacementDays)
            : 0;

        if (name.length < 2 || name.length > 70 || !slug) {
            setFormError("Enter a valid category name with 2–70 characters.");
            return;
        }

        if (!editingSlug && categories.some((item) => item.slug === slug)) {
            setFormError("This category slug already exists. Choose another name.");
            return;
        }

        if (parentId && !parents.some((item) => item.slug === parentId)) {
            setFormError("Select a valid main category.");
            return;
        }

        if (form.type === "Subcategory" && !parentId) {
            setFormError("Please select a parent category.");
            return;
        }

        if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999) {
            setFormError("Display order must be between 1 and 999.");
            return;
        }

        if (attributes.length > 12 ||
            attributes.some((item) => item.length > 40)) {
            setFormError("Enter up to 12 attributes, each within 40 characters.");
            return;
        }

        if (replacementAllowed &&
            (!Number.isInteger(replacementDays) ||
             replacementDays < 1 ||
             replacementDays > 30)) {
            setFormError("Replacement request window must be between 1 and 30 days.");
            return;
        }

        const duplicate = categories.some((category) =>
            category.slug !== editingSlug &&
            category.parentId === parentId &&
            category.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
            setFormError("A category with this name already exists under the selected parent.");
            return;
        }

        if (editingSlug && !editingCategory) {
            setFormError("Category record was not found.");
            return;
        }

        const updatedData = {
            name,
            description,
            parentId,
            sortOrder,
            attributes,
            replacementAllowed: form.type === "Main" ? null : replacementAllowed,
            replacementDays,
        };

        if (editingSlug) {
            setCategories((previous) =>
                previous.map((category) =>
                    category.slug === editingSlug
                        ? { ...category, ...updatedData, updatedAt: new Date().toISOString() }
                        : category
                )
            );

            toast.success("Category updated successfully.");
        } else {
            setCategories((previous) => [
                ...previous,
                {
                    slug,
                    ...updatedData,
                    status: "Active",
                    createdAt: new Date().toISOString(),
                },
            ]);

            toast.success("Category added successfully.");
        }

        setPage(0);
        closeForm();
    };

    // ================== STATUS ACTIONS ==================
    const openStatusAction = (category) => {
        setSelectedSlug(null);
        setStatusAction({
            slug: category.slug,
            previousStatus: category.status,
            nextStatus: category.status === "Active" ? "Disabled" : "Active",
        });
        setReason("");
        setActionError("");
    };

    const closeStatusAction = () => {
        setStatusAction(null);
        setReason("");
        setActionError("");
    };

    const handleStatusUpdate = () => {
        if (!actionCategory ||
            actionCategory.status !== statusAction.previousStatus) {
            toast.error("Category status has changed. Please refresh.");
            closeStatusAction();
            return;
        }

        if (statusAction.nextStatus === "Disabled" && reason.trim().length < 5) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        setCategories((previous) =>
            previous.map((category) =>
                category.slug === statusAction.slug
                    ? {
                          ...category,
                          status: statusAction.nextStatus,
                          remarks: statusAction.nextStatus === "Disabled"
                              ? reason.trim()
                              : "",
                          updatedAt: new Date().toISOString(),
                      }
                    : category
            )
        );

        toast.success(
            statusAction.nextStatus === "Active"
                ? "Category enabled successfully."
                : "Category disabled successfully."
        );

        closeStatusAction();
    };

    return (
        <div className="manage-categories">
            {/* ================== PAGE HEADER ================== */}
            <section className="zc-hero">
                <div className="zc-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-layer-group" aria-hidden="true" />
                        CATEGORY MANAGEMENT
                    </span>

                    <p>
                        Organize product categories, attributes and replacement
                        policies across the marketplace.
                    </p>
                </div>

                <div className="zc-hero-actions">
                    <Button
                        variant="outlined"
                        className="zc-button zc-button--outline"
                        onClick={handleRefresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        className="zc-button zc-button--primary"
                        onClick={() => showForm ? closeForm() : openForm()}
                        startIcon={
                            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />
                        }
                    >
                        {showForm ? "Close Form" : "Add Category"}
                    </Button>
                </div>
            </section>

            {/* ================== ADD / EDIT FORM ================== */}
            {showForm && (
                <section className="zc-card">
                    <div className="zc-section-header">
                        <div className="zc-section-heading">
                            <span className="zc-section-icon">
                                <i className="fa-solid fa-folder-plus" aria-hidden="true" />
                            </span>

                            <div>
                                <h2>{editingSlug ? "Edit Category" : "Add Category"}</h2>
                                <p>
                                    Configure category details, product attributes and replacement rules.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form className="zc-form" onSubmit={handleSave} noValidate>
                        <div className="zc-form-heading">
                            <h3>Category Information</h3>
                            <p>Category slugs stay unchanged after creation to protect existing references.</p>
                        </div>

                        <div className="zc-form-grid">
                            <TextField
                                label="Category Name"
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 70 } }}
                                required
                                fullWidth
                            />

                            <TextField
                                select
                                label="Category Type"
                                name="type"
                                value={form.type}
                                onChange={handleFormChange}
                                disabled={Boolean(editingSlug)}
                                fullWidth
                            >
                                <MenuItem value="Main">Main Category</MenuItem>
                                <MenuItem value="Subcategory">Subcategory</MenuItem>
                            </TextField>

                            <TextField
                                select
                                label="Parent Category"
                                name="parentId"
                                value={form.parentId}
                                onChange={handleFormChange}
                                disabled={form.type === "Main"}
                                required={form.type === "Subcategory"}
                                fullWidth
                            >
                                <MenuItem value="">Select Parent Category</MenuItem>

                                {parents.map((parent) => (
                                    <MenuItem key={parent.slug} value={parent.slug}>
                                        {parent.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Display Order"
                                name="sortOrder"
                                type="number"
                                value={form.sortOrder}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 1, max: 999 } }}
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
                                className="zc-form-full"
                                fullWidth
                            />
                        </div>

                        {form.type === "Subcategory" && (
                            <>
                                <div className="zc-form-heading zc-form-heading--policy">
                                    <h3>Product Attributes & Replacement Policy</h3>
                                    <p>Define the product fields and replacement request window for this subcategory.</p>
                                </div>

                                <div className="zc-form-grid">
                                    <TextField
                                        label="Product Attributes"
                                        name="attributes"
                                        value={form.attributes}
                                        onChange={handleFormChange}
                                        placeholder="Brand, Size, Colour, Material"
                                        helperText="Separate attributes with commas. Maximum 12 attributes."
                                        className="zc-form-full"
                                        fullWidth
                                    />

                                    <TextField
                                        select
                                        label="Replacement Eligible"
                                        name="replacementAllowed"
                                        value={form.replacementAllowed}
                                        onChange={handleFormChange}
                                        fullWidth
                                    >
                                        <MenuItem value="Yes">Yes</MenuItem>
                                        <MenuItem value="No">No</MenuItem>
                                    </TextField>

                                    <TextField
                                        label="Request Window (Days)"
                                        name="replacementDays"
                                        type="number"
                                        value={form.replacementAllowed === "Yes" ? form.replacementDays : ""}
                                        onChange={handleFormChange}
                                        disabled={form.replacementAllowed !== "Yes"}
                                        slotProps={{ htmlInput: { min: 1, max: 30 } }}
                                        helperText="1–30 days. Applies only when replacement is eligible."
                                        fullWidth
                                    />
                                </div>
                            </>
                        )}

                        {formError && (
                            <Alert severity="error" className="zc-form-error">
                                {formError}
                            </Alert>
                        )}

                        <div className="zc-form-footer">
                            <span>
                                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                Changes are saved in the frontend demo only.
                            </span>

                            <div className="zc-form-buttons">
                                <Button variant="outlined" color="inherit" onClick={closeForm}>
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="zc-button--primary"
                                    startIcon={<i className="fa-solid fa-check" />}
                                >
                                    {editingSlug ? "Save Changes" : "Add Category"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            {/* ================== STATISTICS ================== */}
            <section className="zc-stats" aria-label="Category overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`zc-stat zc-stat--${item.theme}`}>
                        <div className="zc-stat-heading">
                            <span>{item.label}</span>

                            <span className="zc-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="zc-stat-value">{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== CATEGORIES LIST ================== */}
            <section className="zc-card">
                <div className="zc-section-header">
                    <div className="zc-section-heading">
                        <span className="zc-section-icon">
                            <i className="fa-solid fa-list-ul" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Product Categories</h2>
                            <p>Manage the hierarchy, catalog associations and replacement rules.</p>
                        </div>
                    </div>

                    <span className="zc-record-count">
                        {filteredCategories.length} Records
                    </span>
                </div>

                {/* ================== FILTERS ================== */}
                <div className="zc-toolbar">
                    <div className="zc-search">
                        <TextField
                            label="Search Categories"
                            placeholder="Category name, slug, parent or attribute"
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
                                htmlInput: { maxLength: 100 },
                            }}
                            fullWidth
                        />
                    </div>

                    <TextField
                        select
                        label="Category Type"
                        value={typeFilter}
                        onChange={(event) => {
                            setTypeFilter(event.target.value);
                            setPage(0);
                        }}
                        className="zc-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Types</MenuItem>
                        <MenuItem value="Main">Main Categories</MenuItem>
                        <MenuItem value="Subcategory">Subcategories</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="zc-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Disabled">Disabled</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="zc-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== TABLE ================== */}
                <TableContainer className="zc-table-container">
                    <Table className="zc-table" aria-label="Product categories">
                        <TableHead>
                            <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell>Parent / Type</TableCell>
                                <TableCell>Preview Products</TableCell>
                                <TableCell>Replacement Policy</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleCategories.map((category) => (
                                <TableRow key={category.slug} hover>
                                    <TableCell>
                                        <div className="zc-category">
                                            <span className={`zc-category-icon ${category.parentId ? "" : "is-main"}`}>
                                                <i className={`fa-solid ${getIcon(category)}`} />
                                            </span>

                                            <div>
                                                <strong>{category.name}</strong>
                                                <span>{category.slug}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zc-parent-info">
                                            <strong>
                                                {category.parentId
                                                    ? getParent(category)?.name || "Unknown Parent"
                                                    : "Top-level"}
                                            </strong>

                                            <small>
                                                {category.parentId ? "Subcategory" : "Main Category"}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="zc-product-count">
                                            {getProductCount(category)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        {category.parentId ? (
                                            category.replacementAllowed ? (
                                                <div className="zc-policy">
                                                    <span className="zc-policy--eligible">Eligible</span>
                                                    <small>{category.replacementDays} days</small>
                                                </div>
                                            ) : (
                                                <span className="zc-policy--excluded">Not Eligible</span>
                                            )
                                        ) : (
                                            <span className="zc-muted">Set per subcategory</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <CategoryBadge status={getStatus(category)} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="zc-view-button"
                                            onClick={() => setSelectedSlug(category.slug)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleCategories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="zc-empty">
                                            <span><i className="fa-solid fa-layer-group" /></span>
                                            <h3>No Categories Found</h3>
                                            <p>Try a different search or filter selection.</p>

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
                    className="zc-pagination"
                    count={filteredCategories.length}
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

            {/* ================== CATEGORY DETAILS ================== */}
            <Dialog
                open={Boolean(selectedCategory)}
                onClose={() => setSelectedSlug(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "zc-dialog-paper" } }}
            >
                {selectedCategory && (
                    <>
                        <DialogTitle className="zc-dialog-title">
                            Category Details
                        </DialogTitle>

                        <DialogContent dividers className="zc-dialog-content">
                            <div className="zc-detail-profile">
                                <span className="zc-category-icon is-main">
                                    <i className={`fa-solid ${getIcon(selectedCategory)}`} />
                                </span>

                                <div>
                                    <h3>{selectedCategory.name}</h3>
                                    <p>{selectedCategory.slug}</p>
                                </div>

                                <CategoryBadge status={getStatus(selectedCategory)} />
                            </div>

                            <div className="zc-detail-section">
                                <h4>Category Information</h4>

                                <dl className="zc-detail-grid">
                                    <DetailItem
                                        label="Category Type"
                                        value={selectedCategory.parentId ? "Subcategory" : "Main Category"}
                                    />
                                    <DetailItem
                                        label="Parent Category"
                                        value={selectedCategory.parentId
                                            ? getParent(selectedCategory)?.name
                                            : "None"}
                                    />
                                    <DetailItem
                                        label="Display Order"
                                        value={selectedCategory.sortOrder}
                                    />
                                    <DetailItem
                                        label="Preview Products"
                                        value={getProductCount(selectedCategory)}
                                    />
                                    {!selectedCategory.parentId && (
                                        <DetailItem
                                            label="Subcategories"
                                            value={getChildren(selectedCategory).length}
                                        />
                                    )}
                                </dl>

                                {selectedCategory.description && (
                                    <p className="zc-detail-description">
                                        {selectedCategory.description}
                                    </p>
                                )}
                            </div>

                            {selectedCategory.parentId && (
                                <div className="zc-detail-section">
                                    <h4>Product & Replacement Rules</h4>

                                    <dl className="zc-detail-grid">
                                        <DetailItem
                                            label="Replacement Eligible"
                                            value={selectedCategory.replacementAllowed ? "Yes" : "No"}
                                        />
                                        <DetailItem
                                            label="Request Window"
                                            value={selectedCategory.replacementAllowed
                                                ? `${selectedCategory.replacementDays} days`
                                                : "Not applicable"}
                                        />
                                    </dl>

                                    <div className="zc-attributes">
                                        <span>Product Attributes</span>

                                        <div>
                                            {selectedCategory.attributes?.length > 0
                                                ? selectedCategory.attributes.map((attribute) => (
                                                    <span className="zc-attribute" key={attribute}>
                                                        {attribute}
                                                    </span>
                                                ))
                                                : <span className="zc-muted">No attributes configured.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCategory.remarks && (
                                <Alert severity="warning">
                                    <strong>Admin Remarks:</strong> {selectedCategory.remarks}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="zc-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedSlug(null)}>
                                Close
                            </Button>

                            <Button variant="outlined" onClick={() => openForm(selectedCategory)}>
                                Edit Details
                            </Button>

                            <Button
                                variant="contained"
                                color={selectedCategory.status === "Active" ? "error" : "primary"}
                                onClick={() => openStatusAction(selectedCategory)}
                            >
                                {selectedCategory.status === "Active" ? "Disable" : "Enable"}
                            </Button>
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
                slotProps={{ paper: { className: "zc-dialog-paper" } }}
            >
                <DialogTitle className="zc-dialog-title">
                    {statusAction?.nextStatus === "Disabled"
                        ? "Disable Category"
                        : "Enable Category"}
                </DialogTitle>

                <DialogContent className="zc-dialog-content">
                    <p className="zc-confirm-text">
                        {statusAction?.nextStatus === "Disabled"
                            ? `Disable ${actionCategory?.name || "this category"}?`
                            : `Enable ${actionCategory?.name || "this category"}?`}
                    </p>

                    {statusAction?.nextStatus === "Disabled" && (
                        <>
                            <Alert severity="warning" className="zc-confirm-alert">
                                {actionCategory && !actionCategory.parentId
                                    ? "Its subcategories will also be considered disabled for new listings. Existing product records are preserved."
                                    : "This subcategory will be unavailable for new listings. Existing product records are preserved."}
                            </Alert>

                            <TextField
                                label="Reason for Disabling"
                                value={reason}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setActionError("");
                                }}
                                error={Boolean(actionError)}
                                helperText={actionError || "A reason is required."}
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </>
                    )}
                </DialogContent>

                <DialogActions className="zc-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={statusAction?.nextStatus === "Disabled" ? "error" : "primary"}
                        onClick={handleStatusUpdate}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Categories;
