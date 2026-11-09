import { useEffect, useState } from "react";
import {
    Alert, Button, Checkbox, FormControlLabel,
    Dialog, DialogActions, DialogContent, DialogTitle,
    InputAdornment, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import * as adminService from "../services/adminService";

const emptyForm = {
    name: "",
    type: "Main",
    parentId: "",
    description: "",
    sortOrder: "1",
    attributes: "",
    showOnHome: false,
    filterBrand: true,
    filterAttributes: [],
    replacementAllowed: "Yes",
    replacementDays: "7",
};

const emptyStats = {
    total: 0,
    main: 0,
    subcategories: 0,
    disabled: 0,
};

function CategoryBadge({ status }) {
    const theme = status === "Active"
        ? "success"
        : status === "Parent Disabled" ? "warning" : "danger";

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

function Categories() {
    const [categories, setCategories] = useState([]);
    const [parents, setParents] = useState([]);
    const [statistics, setStatistics] = useState(emptyStats);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [revision, setRevision] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [busy, setBusy] = useState(false);

    const [categoryImage, setCategoryImage] = useState(null);
    const [categoryPreview, setCategoryPreview] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");

    const [selected, setSelected] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setLoadError("");

        const timer = setTimeout(async () => {
            try {
                const result = await adminService.getCategories(
                    {
                        search: search.trim(),
                        type: typeFilter,
                        status: statusFilter,
                        page: page + 1,
                        limit: rowsPerPage,
                    },
                    controller.signal
                );

                if (!active) return;

                setCategories(result.categories);
                setParents(result.parents);
                setStatistics(result.statistics);
                setTotal(result.total);

                const lastPage = Math.max(
                    0,
                    Math.ceil(result.total / rowsPerPage) - 1
                );

                if (page > lastPage) setPage(lastPage);
            } catch (error) {
                if (!active) return;

                setCategories([]);
                setTotal(0);
                setStatistics(emptyStats);
                setLoadError(error.message);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, typeFilter, statusFilter, page, rowsPerPage, revision]);

    // Release temporary image previews.
    useEffect(() => {
        if (!categoryImage) {
            setCategoryPreview("");
            return;
        }

        const url = URL.createObjectURL(categoryImage);
        setCategoryPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [categoryImage]);

    const hasFilters =
        Boolean(search.trim()) ||
        typeFilter !== "All" ||
        statusFilter !== "All";

    const stats = [
        ["Total Categories", statistics.total, "Main categories and subcategories", "blue", "fa-layer-group"],
        ["Main Categories", statistics.main, "Top-level departments", "green", "fa-folder-tree"],
        ["Subcategories", statistics.subcategories, "Product classification groups", "orange", "fa-tags"],
        ["Disabled Categories", statistics.disabled, "Includes disabled parent categories", "red", "fa-ban"],
    ];

    const attributeOptions = [
        ...new Map(
            form.attributes
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
                .map((value) => [value.toLowerCase(), value])
        ).values(),
    ];

    const refresh = () => setRevision((value) => value + 1);

    const resetFilters = () => {
        setSearch("");
        setTypeFilter("All");
        setStatusFilter("All");
        setPage(0);
    };

    const openForm = (category = null) => {
        setSelected(null);
        setEditing(category);
        setCategoryImage(null);
        setFormError("");

        setForm(category ? {
            name: category.name,
            type: category.parentId ? "Subcategory" : "Main",
            parentId: category.parentId || "",
            description: category.description || "",
            sortOrder: String(category.sortOrder),
            attributes: category.attributes.join(", "),
            showOnHome: Boolean(category.showOnHome),
            filterBrand: category.filterBrand !== false,
            filterAttributes: category.filterAttributes || [],
            replacementAllowed: category.replacementAllowed ? "Yes" : "No",
            replacementDays: String(category.replacementDays || 7),
        } : { ...emptyForm });

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeForm = () => {
        if (busy) return;

        setShowForm(false);
        setEditing(null);
        setCategoryImage(null);
        setFormError("");
        setForm({ ...emptyForm });
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        if (name === "type") setCategoryImage(null);

        setForm((previous) => ({
            ...previous,
            [name]: value,
            ...(name === "type" ? { parentId: "" } : {}),
        }));

        setFormError("");
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (busy) return;

        const isSubcategory = form.type === "Subcategory";

        if (isSubcategory && !form.parentId) {
            setFormError("Select a parent category.");
            return;
        }

        const replacementAllowed =
            isSubcategory && form.replacementAllowed === "Yes";

        const values = {
            name: form.name.trim().replace(/\s+/g, " "),
            parentId: isSubcategory ? form.parentId : null,
            description: form.description.trim(),
            sortOrder: Number(form.sortOrder),
            attributes: isSubcategory ? attributeOptions : [],

            showOnHome: !isSubcategory && form.showOnHome,
            filterBrand: form.filterBrand,

            filterAttributes: isSubcategory
                ? form.filterAttributes.filter((name) =>
                    attributeOptions.some((attribute) =>
                        attribute.toLowerCase() === name.toLowerCase()
                    )
                )
                : [],

            replacementAllowed,
            replacementDays: replacementAllowed
                ? Number(form.replacementDays)
                : 0,
        };

        if (values.name.length < 2 || values.name.length > 70) {
            setFormError("Category name must contain 2–70 characters.");
            return;
        }

        if (
            values.showOnHome &&
            !categoryImage &&
            !editing?.image?.url
        ) {
            setFormError("Upload a category image before showing it on Home.");
            return;
        }

        setBusy(true);
        setFormError("");

        try {
            const body = new FormData();

            body.append("data", JSON.stringify({
                ...values,
                ...(editing ? { version: editing.version } : {}),
            }));

            if (!isSubcategory && categoryImage) {
                body.append("images", categoryImage);
            }

            const result = editing
                ? await adminService.updateCategory(editing._id, body)
                : await adminService.createCategory(body);

            toast.success(result.message);
            setShowForm(false);
            setCategoryImage(null);
            setEditing(null);
            setForm({ ...emptyForm });
            setPage(0);
            refresh();
        } catch (error) {
            setFormError(error.message);
        } finally {
            setBusy(false);
        }
    };

    const openStatusAction = (category) => {
        setSelected(null);
        setStatusAction({
            ...category,
            nextStatus: category.status === "Active" ? "Disabled" : "Active",
        });
        setReason("");
        setActionError("");
    };

    const closeStatusAction = () => {
        if (busy) return;

        setStatusAction(null);
        setReason("");
        setActionError("");
    };

    const handleStatusUpdate = async () => {
        if (busy || !statusAction) return;

        if (
            statusAction.nextStatus === "Disabled" &&
            reason.trim().length < 5
        ) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        setBusy(true);
        setActionError("");

        try {
            const result = await adminService.updateCategoryStatus(
                statusAction._id,
                {
                    status: statusAction.nextStatus,
                    reason: statusAction.nextStatus === "Disabled"
                        ? reason.trim()
                        : "",
                    version: statusAction.version,
                }
            );

            toast.success(result.message);
            setStatusAction(null);
            refresh();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="manage-categories">
            <section className="zc-hero">
                <div className="zc-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-layer-group" aria-hidden="true" />
                        CATEGORY MANAGEMENT
                    </span>
                    <p>Organize product categories, attributes and replacement policies across the marketplace.</p>
                </div>

                <div className="zc-hero-actions">
                    <Button
                        variant="outlined"
                        className="zc-button zc-button--outline"
                        onClick={refresh}
                        disabled={loading || busy}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        className="zc-button zc-button--primary"
                        onClick={() => showForm ? closeForm() : openForm()}
                        disabled={loading || busy || Boolean(loadError)}
                        startIcon={<i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />}
                    >
                        {showForm ? "Close Form" : "Add Category"}
                    </Button>
                </div>
            </section>

            {loadError && (
                <Alert
                    severity="error"
                    action={<Button color="inherit" onClick={refresh}>Retry</Button>}
                >
                    {loadError}
                </Alert>
            )}

            {showForm && (
                <section className="zc-card">
                    <div className="zc-section-header">
                        <div className="zc-section-heading">
                            <span className="zc-section-icon">
                                <i className="fa-solid fa-folder-plus" aria-hidden="true" />
                            </span>
                            <div>
                                <h2>{editing ? "Edit Category" : "Add Category"}</h2>
                                <p>Configure category details, product attributes and replacement rules.</p>
                            </div>
                        </div>
                    </div>

                    <form className="zc-form" onSubmit={handleSave} noValidate>
                        <div className="zc-form-heading">
                            <h3>Category Information</h3>
                            <p>Slug, category type and parent remain fixed after creation.</p>
                        </div>

                        <div className="zc-form-grid">
                            <TextField
                                label="Category Name"
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 70 } }}
                                disabled={busy}
                                required
                                fullWidth
                            />

                            <TextField
                                select
                                label="Category Type"
                                name="type"
                                value={form.type}
                                onChange={handleFormChange}
                                disabled={busy || Boolean(editing)}
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
                                disabled={busy || Boolean(editing) || form.type === "Main"}
                                required={form.type === "Subcategory"}
                                fullWidth
                            >
                                <MenuItem value="">Select Parent Category</MenuItem>
                                {parents.map((parent) => (
                                    <MenuItem
                                        key={parent._id}
                                        value={parent._id}
                                        disabled={parent.status !== "Active"}
                                    >
                                        {parent.name}{parent.status !== "Active" ? " (Disabled)" : ""}
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
                                disabled={busy}
                                required
                                fullWidth
                            />

                            <TextField
                                label="Description (Optional)"
                                name="description"
                                value={form.description}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 240 } }}
                                className="zc-form-full"
                                multiline
                                minRows={2}
                                disabled={busy}
                                fullWidth
                            />
                        </div>

                        {form.type === "Main" && (
                            <div className="zc-form-grid mt-3">
                                <div className="zc-form-full">
                                    {(categoryPreview || editing?.image?.url) && (
                                        <img
                                            src={categoryPreview || editing.image.url}
                                            alt="Category preview"
                                            width="100"
                                            height="100"
                                            className="object-fit-contain rounded border d-block mb-2"
                                        />
                                    )}

                                    <label className="d-block">
                                        Category image (JPG, PNG or WebP, up to 3 MB)
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp"
                                            className="form-control mt-2"
                                            disabled={busy}
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];

                                                if (file && file.size > 3 * 1024 * 1024) {
                                                    setFormError("Choose an image up to 3 MB.");
                                                    event.target.value = "";
                                                    return;
                                                }

                                                setCategoryImage(file || null);
                                                setFormError("");
                                            }}
                                        />
                                    </label>
                                </div>

                                <FormControlLabel
                                    label="Show category on Home"
                                    control={
                                        <Checkbox
                                            disabled={busy}
                                            checked={form.showOnHome}
                                            onChange={(_, checked) => setForm((previous) => ({
                                                ...previous,
                                                showOnHome: checked,
                                            }))}
                                        />
                                    }
                                />
                            </div>
                        )}

                        {form.type === "Subcategory" && (
                            <>
                                <div className="zc-form-heading zc-form-heading--policy">
                                    <h3>Product Attributes & Replacement Policy</h3>
                                    <p>Configure the product fields and replacement request window.</p>
                                </div>

                                <div className="zc-form-grid">
                                    <TextField
                                        label="Product Attributes"
                                        name="attributes"
                                        value={form.attributes}
                                        onChange={handleFormChange}
                                        placeholder="Brand, Size, Colour, Material"
                                        helperText="Separate with commas. Maximum 12 attributes, 40 characters each."
                                        slotProps={{ htmlInput: { maxLength: 600 } }}
                                        className="zc-form-full"
                                        disabled={busy}
                                        fullWidth
                                    />

                                    <div className="zc-form-full">
                                        <p className="mb-1">Show these specification filters</p>

                                        {attributeOptions.map((attribute) => (
                                            <FormControlLabel
                                                key={attribute}
                                                label={attribute}
                                                control={
                                                    <Checkbox
                                                        disabled={busy}
                                                        checked={form.filterAttributes.some(
                                                            (name) => name.toLowerCase() === attribute.toLowerCase()
                                                        )}
                                                        onChange={(_, checked) => setForm((previous) => ({
                                                            ...previous,
                                                            filterAttributes: checked
                                                                ? [...previous.filterAttributes, attribute]
                                                                : previous.filterAttributes.filter(
                                                                    (name) => name.toLowerCase() !== attribute.toLowerCase()
                                                                ),
                                                        }))}
                                                    />
                                                }
                                            />
                                        ))}

                                        <FormControlLabel
                                            label="Show Brand filter"
                                            control={
                                                <Checkbox
                                                    disabled={busy}
                                                    checked={form.filterBrand}
                                                    onChange={(_, checked) => setForm((previous) => ({
                                                        ...previous,
                                                        filterBrand: checked,
                                                    }))}
                                                />
                                            }
                                        />
                                    </div>

                                    <TextField
                                        select
                                        label="Replacement Eligible"
                                        name="replacementAllowed"
                                        value={form.replacementAllowed}
                                        onChange={handleFormChange}
                                        disabled={busy}
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
                                        disabled={busy || form.replacementAllowed !== "Yes"}
                                        slotProps={{ htmlInput: { min: 1, max: 30 } }}
                                        helperText="1–30 days when replacement is eligible."
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
                                Changes apply after saving.
                            </span>

                            <div className="zc-form-buttons">
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={closeForm}
                                    disabled={busy}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="zc-button--primary"
                                    disabled={busy}
                                    startIcon={<i className="fa-solid fa-check" />}
                                >
                                    {busy ? "Saving..." : editing ? "Save Changes" : "Add Category"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            <section className="zc-stats" aria-label="Category overview">
                {stats.map(([label, value, description, theme, icon]) => (
                    <article key={label} className={`zc-stat zc-stat--${theme}`}>
                        <div className="zc-stat-heading">
                            <span>{label}</span>
                            <span className="zc-stat-icon">
                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                            </span>
                        </div>
                        <strong className="zc-stat-value">
                            {loading || loadError ? "—" : value}
                        </strong>
                        <p>{description}</p>
                    </article>
                ))}
            </section>

            <section className="zc-card">
                <div className="zc-section-header">
                    <div className="zc-section-heading">
                        <span className="zc-section-icon">
                            <i className="fa-solid fa-list-ul" aria-hidden="true" />
                        </span>
                        <div>
                            <h2>Product Categories</h2>
                            <p>Manage category hierarchy and replacement rules.</p>
                        </div>
                    </div>
                    <span className="zc-record-count">{total} Records</span>
                </div>

                <div className="zc-toolbar">
                    <div className="zc-search">
                        <TextField
                            label="Search Categories"
                            placeholder="Name, slug, parent or attribute"
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

                <TableContainer className="zc-table-container">
                    <Table className="zc-table" aria-label="Product categories">
                        <TableHead>
                            <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell>Parent / Type</TableCell>
                                <TableCell>Display Order</TableCell>
                                <TableCell>Replacement Policy</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {!loading && !loadError && categories.map((category) => (
                                <TableRow key={category._id} hover>
                                    <TableCell>
                                        <div className="zc-category">
                                            <span className={`zc-category-icon ${category.parentId ? "" : "is-main"}`}>
                                                <i className={`fa-solid ${category.parentId ? "fa-tags" : "fa-folder-tree"}`} />
                                            </span>
                                            <div>
                                                <strong>{category.name}</strong>
                                                <span>{category.slug}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zc-parent-info">
                                            <strong>{category.parentName || "Top-level"}</strong>
                                            <small>{category.parentId ? "Subcategory" : "Main Category"}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>{category.sortOrder}</TableCell>

                                    <TableCell>
                                        {!category.parentId ? (
                                            <span className="zc-muted">Set per subcategory</span>
                                        ) : category.replacementAllowed ? (
                                            <div className="zc-policy">
                                                <span className="zc-policy--eligible">Eligible</span>
                                                <small>{category.replacementDays} days</small>
                                            </div>
                                        ) : (
                                            <span className="zc-policy--excluded">Not Eligible</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <CategoryBadge status={category.effectiveStatus} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="zc-view-button"
                                            onClick={() => setSelected(category)}
                                            disabled={busy}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {(loading || loadError || !categories.length) && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="zc-empty">
                                            <span><i className="fa-solid fa-layer-group" /></span>
                                            <h3>
                                                {loading
                                                    ? "Loading Categories..."
                                                    : loadError ? "Unable to Load Categories" : "No Categories Found"}
                                            </h3>
                                            <p>
                                                {loadError
                                                    ? "Retry to load your category records."
                                                    : !loading && "Add a category or adjust your filters."}
                                            </p>
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
                    count={total}
                    page={Math.min(page, Math.max(0, Math.ceil(total / rowsPerPage) - 1))}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "zc-dialog-paper" } }}
            >
                {selected && (
                    <>
                        <DialogTitle className="zc-dialog-title">Category Details</DialogTitle>

                        <DialogContent dividers className="zc-dialog-content">
                            <div className="zc-detail-profile">
                                <span className="zc-category-icon is-main">
                                    <i className="fa-solid fa-tags" />
                                </span>
                                <div>
                                    <h3>{selected.name}</h3>
                                    <p>{selected.slug}</p>
                                </div>
                                <CategoryBadge status={selected.effectiveStatus} />
                            </div>

                            <div className="zc-detail-section">
                                <h4>Category Information</h4>
                                <dl className="zc-detail-grid">
                                    <DetailItem label="Category Type" value={selected.parentId ? "Subcategory" : "Main Category"} />
                                    <DetailItem label="Parent Category" value={selected.parentName || "None"} />
                                    <DetailItem label="Display Order" value={selected.sortOrder} />
                                    <DetailItem label="Category ID" value={selected._id} />
                                    {!selected.parentId && (
                                        <DetailItem label="Show on Home" value={selected.showOnHome ? "Yes" : "No"} />
                                    )}
                                </dl>

                                {!selected.parentId && selected.image?.url && (
                                    <img
                                        src={selected.image.url}
                                        alt={selected.name}
                                        width="100"
                                        height="100"
                                        className="object-fit-contain rounded border mt-2"
                                    />
                                )}

                                {selected.description && (
                                    <p className="zc-detail-description">{selected.description}</p>
                                )}
                            </div>

                            {selected.parentId && (
                                <div className="zc-detail-section">
                                    <h4>Product & Replacement Rules</h4>
                                    <dl className="zc-detail-grid">
                                        <DetailItem label="Replacement Eligible" value={selected.replacementAllowed ? "Yes" : "No"} />
                                        <DetailItem
                                            label="Request Window"
                                            value={selected.replacementAllowed ? `${selected.replacementDays} days` : "Not applicable"}
                                        />
                                        <DetailItem label="Brand Filter" value={selected.filterBrand !== false ? "Enabled" : "Disabled"} />
                                        <DetailItem label="Attribute Filters" value={(selected.filterAttributes || []).join(", ") || "None"} />
                                    </dl>

                                    <div className="zc-attributes">
                                        <span>Product Attributes</span>
                                        <div>
                                            {selected.attributes.length
                                                ? selected.attributes.map((attribute) => (
                                                    <span className="zc-attribute" key={attribute}>{attribute}</span>
                                                ))
                                                : <span className="zc-muted">No attributes configured.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selected.effectiveStatus === "Parent Disabled" && (
                                <Alert severity="warning">
                                    Enable the parent category to make this active subcategory available.
                                </Alert>
                            )}

                            {selected.remarks && (
                                <Alert severity="warning">
                                    <strong>Admin Remarks:</strong> {selected.remarks}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="zc-dialog-actions">
                            <Button color="inherit" onClick={() => setSelected(null)}>Close</Button>
                            <Button variant="outlined" onClick={() => openForm(selected)} disabled={busy}>
                                Edit Details
                            </Button>
                            <Button
                                variant="contained"
                                color={selected.status === "Active" ? "error" : "primary"}
                                onClick={() => openStatusAction(selected)}
                                disabled={busy}
                            >
                                {selected.status === "Active" ? "Disable" : "Enable"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog
                open={Boolean(statusAction)}
                onClose={closeStatusAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "zc-dialog-paper" } }}
            >
                <DialogTitle className="zc-dialog-title">
                    {statusAction?.nextStatus === "Disabled" ? "Disable Category" : "Enable Category"}
                </DialogTitle>

                <DialogContent className="zc-dialog-content">
                    <p className="zc-confirm-text">
                        {statusAction?.nextStatus === "Disabled" ? "Disable" : "Enable"} {statusAction?.name}?
                    </p>

                    {statusAction?.nextStatus === "Disabled" && (
                        <>
                            <Alert severity="warning" className="zc-confirm-alert">
                                {statusAction.parentId
                                    ? "This subcategory will be unavailable for new listings."
                                    : "Its subcategories will also be unavailable while this parent is disabled."}
                                {" "}Existing records are preserved.
                            </Alert>

                            <TextField
                                label="Reason for Disabling"
                                value={reason}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setActionError("");
                                }}
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                disabled={busy}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </>
                    )}

                    {actionError && <Alert severity="error">{actionError}</Alert>}
                </DialogContent>

                <DialogActions className="zc-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color={statusAction?.nextStatus === "Disabled" ? "error" : "primary"}
                        onClick={handleStatusUpdate}
                        disabled={busy}
                    >
                        {busy ? "Saving..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Categories;