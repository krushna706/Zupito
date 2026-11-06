
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import {
    compressImage,
    getCategories,
    getProducts,
    getStoreName,
    saveProducts,
} from "../services/sellerService";

const emptyVariant = () => ({
    id: crypto.randomUUID(),
    sku: "",
    label: "Standard",
    price: "",
    mrp: "",
    stock: "0",
    imageIndex: 0,
});

const emptySpec = () => ({ label: "", value: "" });

function initialForm(item) {
    const images = item?.images?.length
        ? item.images
        : item?.image ? [item.image] : [];

    return {
        name: item?.name || "",
        brand: item?.brand || "",
        group: item?.group || "",
        category: item?.category || "",
        images,
        description: item?.description?.map((entry) =>
            entry.text
        ).join("\n\n") || "",
        highlights: item?.highlights?.join("\n") || "",
        specifications: item?.specifications?.map(({ label, value }) => ({
            label, value,
        })) || [emptySpec()],
        variants: item?.variants?.length
            ? item.variants.map((variant) => ({
                id: variant.id,
                sku: variant.sku || "",
                label: variant.options?.variant ||
                    variant.variantLabel || "Standard",
                price: String(variant.price ?? ""),
                mrp: String(variant.mrp ?? ""),
                stock: String(variant.stock ?? 0),
                imageIndex: Math.max(
                    0, images.indexOf(variant.image)
                ),
            }))
            : [emptyVariant()],
    };
}

const contentSignature = (item) => JSON.stringify({
    name: item.name,
    brand: item.brand,
    group: item.group,
    category: item.category,
    images: item.images,
    description: item.description,
    highlights: item.highlights,
    specifications: item.specifications,
    variants: item.variants.map(({ id, sku, options, image }) => ({
        id, sku, options, image,
    })),
});

// ================== PRODUCT FORM ==================
function ProductForm({ user }) {
    const { productId } = useParams();
    const navigate = useNavigate();

    const categories = useMemo(getCategories, []);

    const original = useMemo(() => productId
        ? getProducts().find((item) =>
            item.id === productId &&
            (
                item.sellerId === user?.id ||
                item.sellerEmail?.toLowerCase() ===
                    user?.email?.toLowerCase()
            )
        )
        : null, [productId, user?.id, user?.email]);

    const [form, setForm] = useState(() => initialForm(original));
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setForm(initialForm(original));
        setErrors({});
    }, [original]);

    const parents = categories.filter((item) =>
        !item.parentId && item.status === "Active"
    );

    const children = categories.filter((item) =>
        item.parentId === form.group && item.status === "Active"
    );

    const update = (name, value) => {
        setForm((old) => ({ ...old, [name]: value }));
        setErrors((old) => ({ ...old, [name]: "" }));
    };

    const changeCategory = (value) => {
        const chosen = categories.find((item) => item.slug === value);

        setErrors((old) => ({ ...old, category: "" }));

        setForm((old) => ({
            ...old,
            category: value,
            specifications: old.specifications.some(
                (spec) => spec.label || spec.value
            )
                ? old.specifications
                : chosen?.attributes?.length
                    ? chosen.attributes.map((label) => ({
                        label, value: "",
                    }))
                    : [emptySpec()],
        }));
    };

    const changeVariant = (index, key, value) => {
        setForm((old) => ({
            ...old,
            variants: old.variants.map((item, i) =>
                i === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const changeSpec = (index, key, value) => {
        setForm((old) => ({
            ...old,
            specifications: old.specifications.map((item, i) =>
                i === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    // ================== IMAGES ==================
    const uploadImages = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";

        if (!files.length) return;

        if (files.length + form.images.length > 4) {
            toast.error("Maximum 4 product images allowed.");
            return;
        }

        setUploading(true);

        try {
            const images = await Promise.all(files.map(compressImage));

            setForm((old) => ({
                ...old,
                images: [...old.images, ...images],
            }));
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setForm((old) => ({
            ...old,
            images: old.images.filter((_, i) => i !== index),
            variants: old.variants.map((variant) => ({
                ...variant,
                imageIndex: variant.imageIndex > index
                    ? variant.imageIndex - 1
                    : variant.imageIndex === index
                        ? 0
                        : variant.imageIndex,
            })),
        }));
    };

    const coverImage = (index) => {
        setForm((old) => {
            const images = [
                old.images[index],
                ...old.images.filter((_, i) => i !== index),
            ];

            return {
                ...old,
                images,
                variants: old.variants.map((variant) => ({
                    ...variant,
                    imageIndex: Math.max(
                        0, images.indexOf(old.images[variant.imageIndex])
                    ),
                })),
            };
        });
    };

    // ================== SAVE PRODUCT ==================
    const handleSave = (event) => {
        event.preventDefault();
        if (uploading) return;

        const name = form.name.trim();
        const brand = form.brand.trim();
        const description = form.description.trim();

        const highlights = form.highlights
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean);

        const specifications = form.specifications
            .map((item) => ({
                label: item.label.trim(),
                value: item.value.trim(),
            }))
            .filter((item) => item.label || item.value);

        const problems = {};

        if (name.length < 3) {
            problems.name = "Enter at least 3 characters.";
        }

        if (brand.length < 2) {
            problems.brand = "Enter a brand name.";
        }

        if (
            !form.group ||
            !form.category ||
            !children.some((c) => c.slug === form.category)
        ) {
            problems.category = "Select an active category.";
        }

        if (description.length < 20) {
            problems.description = "Write at least 20 characters.";
        }

        if (!form.images.length) {
            problems.images = "Upload at least one product image.";
        }

        if (specifications.some((item) => !item.label || !item.value)) {
            problems.specifications = "Complete both specification fields.";
        }

        const skus = form.variants.map((item) =>
            item.sku.trim().toUpperCase()
        );

        const allProducts = getProducts();

        const takenSkus = allProducts
            .filter((item) =>
                item.id !== productId && item.sellerId === user?.id
            )
            .flatMap((item) =>
                (item.variants || []).map((v) =>
                    String(v.sku || "").toUpperCase()
                )
            );

        if (
            new Set(skus).size !== skus.length ||
            skus.some((sku) => takenSkus.includes(sku))
        ) {
            problems.variants =
                "Each SKU must be unique across your products.";
        }

        if (form.variants.some((item) =>
            !/^[A-Z0-9_-]{3,30}$/.test(item.sku.trim().toUpperCase()) ||
            !item.label.trim() ||
            !Number.isFinite(Number(item.price)) ||
            Number(item.price) <= 0 ||
            !Number.isFinite(Number(item.mrp)) ||
            Number(item.mrp) < Number(item.price) ||
            !/^(0|[1-9]\d*)$/.test(String(item.stock))
        )) {
            problems.variants = problems.variants ||
                "Check SKU, variant, price, MRP and stock values.";
        }

        if (Object.keys(problems).length) {
            setErrors(problems);
            toast.error("Please correct the highlighted product details.");
            return;
        }

        const variants = form.variants.map((item) => ({
            id: item.id,
            sku: item.sku.trim().toUpperCase(),
            options: { variant: item.label.trim() },
            variantLabel: item.label.trim(),
            price: Number(item.price),
            mrp: Number(item.mrp),
            stock: Number(item.stock),
            image: form.images[item.imageIndex] || form.images[0],
        }));

        const details = {
            name,
            brand,
            group: form.group,
            category: form.category,
            image: form.images[0],
            images: form.images,
            price: variants[0].price,
            mrp: variants[0].mrp,
            stock: variants.reduce(
                (sum, variant) => sum + variant.stock, 0
            ),
            variants,
            defaultVariantId: variants[0].id,
            optionGroups: [{
                key: "variant",
                label: "Variant",
                values: variants.map((v) => ({
                    value: v.variantLabel,
                    label: v.variantLabel,
                })),
            }],
            highlights,
            description: [{ title: "Product Details", text: description }],
            specifications,
        };

        const now = new Date().toISOString();

        const changed = original &&
            contentSignature(original) !== contentSignature(details);

        const resubmitted = changed &&
            original?.status !== "Suspended";

        const status = original
            ? resubmitted ? "Pending" : original.status
            : "Pending";

        const updatedProduct = {
            ...(original || {}),
            ...details,
            id: original?.id || `seller-${crypto.randomUUID()}`,
            productCode: original?.productCode ||
                `ZP-${Date.now().toString(36).toUpperCase()}`,
            sellerId: user?.id,
            sellerEmail: user?.email,
            seller: getStoreName(user),
            status,
            reviewType: !original
                ? "New Listing"
                : changed
                    ? "Content Update"
                    : original.reviewType,
            submittedAt: !original || resubmitted
                ? now
                : original.submittedAt,
            reviewedAt: resubmitted
                ? null
                : original?.reviewedAt || null,
            updatedAt: now,
            moderationReason: resubmitted
                ? ""
                : original?.moderationReason || "",
            history: resubmitted
                ? [
                    ...(original.history || []),
                    {
                        status: "Pending",
                        date: now,
                        reason: "Seller updated listing content.",
                    },
                ]
                : original?.history || [],
        };

        try {
            const latest = getProducts();

            const next = original
                ? latest.map((item) =>
                    item.id === original.id ? updatedProduct : item
                )
                : [...latest, updatedProduct];

            saveProducts(next);

            toast.success(original
                ? "Product updated successfully."
                : "Product submitted for review."
            );

            navigate("/manage/products");
        } catch {
            toast.error("Unable to save. Browser storage may be full.");
        }
    };

    if (productId && !original) {
        return (
            <main className="seller-product-page">
                <section className="sp-card sp-missing">
                    <h2>Product not available</h2>
                    <p>This product is not part of your seller account.</p>

                    <Button
                        component={Link}
                        to="/manage/products"
                        variant="outlined"
                    >
                        Back to Products
                    </Button>
                </section>
            </main>
        );
    }

    return (
        <main className="seller-product-page">
            {/* Page Header */}
            <section className="sp-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-box-open" aria-hidden="true" />
                        {original ? "EDIT PRODUCT" : "ADD PRODUCT"}
                    </h1>

                    <p>
                        {original
                            ? "Update your listing and review its moderation status."
                            : "Create a detailed product listing for marketplace review."}
                    </p>
                </div>

                <Button
                    component={Link}
                    to="/manage/products"
                    variant="outlined"
                    startIcon={<i className="fa-solid fa-arrow-left" />}
                >
                    Back to Products
                </Button>
            </section>

            {original && (
                <div className="sp-notice">
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />

                    <span>
                        <strong>Status: {original.status}.</strong>{" "}
                        Price and stock changes retain the existing approval
                        status. Material content changes require review.

                        {original.moderationReason && (
                            <small>
                                Admin remarks: {original.moderationReason}
                            </small>
                        )}
                    </span>
                </div>
            )}

            <form onSubmit={handleSave} noValidate>
                <div className="sp-form-grid">
                    {/* Product Information */}
                    <section className="sp-card">
                        <div className="sp-card-head">
                            <span className="sp-section-icon">
                                <i className="fa-solid fa-tag" />
                            </span>

                            <div>
                                <h2>Product Information</h2>
                                <p>Basic listing details and category classification.</p>
                            </div>
                        </div>

                        <div className="sp-fields">
                            <TextField
                                label="Product Name"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                                className="sp-wide"
                                slotProps={{ htmlInput: { maxLength: 120 } }}
                            />

                            <TextField
                                label="Brand"
                                value={form.brand}
                                onChange={(e) => update("brand", e.target.value)}
                                error={!!errors.brand}
                                helperText={errors.brand}
                                required
                            />

                            <TextField
                                select
                                label="Main Category"
                                value={form.group}
                                onChange={(e) => {
                                    update("group", e.target.value);
                                    update("category", "");
                                }}
                                required
                            >
                                {parents.map((item) => (
                                    <MenuItem key={item.slug} value={item.slug}>
                                        {item.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Subcategory"
                                value={form.category}
                                onChange={(e) => changeCategory(e.target.value)}
                                error={!!errors.category}
                                helperText={errors.category}
                                required
                                disabled={!form.group}
                                className="sp-wide"
                            >
                                {children.map((item) => (
                                    <MenuItem key={item.slug} value={item.slug}>
                                        {item.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Product Description"
                                value={form.description}
                                onChange={(e) => update("description", e.target.value)}
                                error={!!errors.description}
                                helperText={
                                    errors.description ||
                                    `${form.description.length}/2000 characters`
                                }
                                multiline
                                minRows={4}
                                className="sp-wide"
                                slotProps={{ htmlInput: { maxLength: 2000 } }}
                                required
                            />

                            <TextField
                                label="Highlights (one per line)"
                                value={form.highlights}
                                onChange={(e) => update("highlights", e.target.value)}
                                multiline
                                minRows={3}
                                helperText="Optional selling points"
                                className="sp-wide"
                                slotProps={{ htmlInput: { maxLength: 900 } }}
                            />
                        </div>
                    </section>

                    {/* Product Images */}
                    <section className="sp-card">
                        <div className="sp-card-head">
                            <span className="sp-section-icon">
                                <i className="fa-solid fa-images" />
                            </span>

                            <div>
                                <h2>Product Images</h2>
                                <p>Upload up to 4 images. The first image is the cover.</p>
                            </div>
                        </div>

                        <label className="sp-upload">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                hidden
                                disabled={uploading || form.images.length >= 4}
                                onChange={uploadImages}
                            />

                            <i className="fa-solid fa-cloud-arrow-up" />
                            <strong>
                                {uploading
                                    ? "Processing images..."
                                    : "Choose Product Images"}
                            </strong>
                            <span>JPG, PNG or WebP · Max 3 MB each</span>
                        </label>

                        {errors.images && (
                            <p className="sp-error">{errors.images}</p>
                        )}

                        <div className="sp-image-grid">
                            {form.images.map((image, index) => (
                                <div className="sp-image-tile" key={index}>
                                    <img
                                        src={image}
                                        alt={`Product image ${index + 1}`}
                                    />

                                    <div>
                                        <span>
                                            {index === 0
                                                ? "Cover"
                                                : `Image ${index + 1}`}
                                        </span>

                                        {index !== 0 && (
                                            <button
                                                type="button"
                                                title="Set as cover"
                                                onClick={() => coverImage(index)}
                                            >
                                                <i className="fa-solid fa-star" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            title="Remove image"
                                            onClick={() => removeImage(index)}
                                        >
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Product Variants */}
                <section className="sp-card sp-form-section">
                    <div className="sp-card-head">
                        <span className="sp-section-icon">
                            <i className="fa-solid fa-layer-group" />
                        </span>

                        <div>
                            <h2>Product Variants</h2>
                            <p>
                                Each variant needs a unique SKU, price,
                                MRP and available stock.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => setForm((old) => ({
                                ...old,
                                variants: [...old.variants, emptyVariant()],
                            }))}
                            startIcon={<i className="fa-solid fa-plus" />}
                        >
                            Add Variant
                        </Button>
                    </div>

                    {errors.variants && (
                        <p className="sp-error">{errors.variants}</p>
                    )}

                    <div className="sp-variant-list">
                        {form.variants.map((variant, index) => (
                            <div className="sp-variant" key={variant.id}>
                                <div className="sp-variant-head">
                                    <strong>Variant {index + 1}</strong>

                                    <Button
                                        type="button"
                                        color="error"
                                        size="small"
                                        disabled={form.variants.length === 1}
                                        onClick={() => setForm((old) => ({
                                            ...old,
                                            variants: old.variants.filter(
                                                (v) => v.id !== variant.id
                                            ),
                                        }))}
                                    >
                                        Remove
                                    </Button>
                                </div>

                                <div className="sp-variant-fields">
                                    <TextField
                                        label="SKU"
                                        value={variant.sku}
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "sku",
                                                e.target.value.toUpperCase()
                                            )
                                        }
                                        required
                                        slotProps={{
                                            htmlInput: { maxLength: 30 },
                                        }}
                                    />

                                    <TextField
                                        label="Variant (Size / Colour / Pack)"
                                        value={variant.label}
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "label", e.target.value
                                            )
                                        }
                                        required
                                    />

                                    <TextField
                                        label="Selling Price (₹)"
                                        type="number"
                                        value={variant.price}
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "price", e.target.value
                                            )
                                        }
                                        required
                                        slotProps={{
                                            htmlInput: { min: 1, step: "0.01" },
                                        }}
                                    />

                                    <TextField
                                        label="MRP (₹)"
                                        type="number"
                                        value={variant.mrp}
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "mrp", e.target.value
                                            )
                                        }
                                        required
                                        slotProps={{
                                            htmlInput: { min: 1, step: "0.01" },
                                        }}
                                    />

                                    <TextField
                                        label="Available Stock"
                                        type="number"
                                        value={variant.stock}
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "stock", e.target.value
                                            )
                                        }
                                        required
                                        slotProps={{
                                            htmlInput: { min: 0, step: 1 },
                                        }}
                                    />

                                    <TextField
                                        select
                                        label="Variant Image"
                                        value={
                                            form.images.length
                                                ? String(Math.min(
                                                    variant.imageIndex,
                                                    form.images.length - 1
                                                ))
                                                : ""
                                        }
                                        onChange={(e) =>
                                            changeVariant(
                                                index, "imageIndex",
                                                Number(e.target.value)
                                            )
                                        }
                                        disabled={!form.images.length}
                                    >
                                        {form.images.map((_, i) => (
                                            <MenuItem key={i} value={String(i)}>
                                                {i === 0
                                                    ? "Cover Image"
                                                    : `Image ${i + 1}`}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Specifications */}
                <section className="sp-card sp-form-section">
                    <div className="sp-card-head">
                        <span className="sp-section-icon">
                            <i className="fa-solid fa-list" />
                        </span>

                        <div>
                            <h2>Specifications</h2>
                            <p>Provide relevant technical or product attributes.</p>
                        </div>

                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => setForm((old) => ({
                                ...old,
                                specifications: [
                                    ...old.specifications,
                                    emptySpec(),
                                ],
                            }))}
                            startIcon={<i className="fa-solid fa-plus" />}
                        >
                            Add Specification
                        </Button>
                    </div>

                    {errors.specifications && (
                        <p className="sp-error">{errors.specifications}</p>
                    )}

                    <div className="sp-spec-list">
                        {form.specifications.map((spec, index) => (
                            <div className="sp-spec-row" key={index}>
                                <TextField
                                    label="Attribute"
                                    value={spec.label}
                                    onChange={(e) =>
                                        changeSpec(
                                            index, "label", e.target.value
                                        )
                                    }
                                />

                                <TextField
                                    label="Value"
                                    value={spec.value}
                                    onChange={(e) =>
                                        changeSpec(
                                            index, "value", e.target.value
                                        )
                                    }
                                />

                                <Button
                                    type="button"
                                    color="error"
                                    disabled={form.specifications.length === 1}
                                    onClick={() => setForm((old) => ({
                                        ...old,
                                        specifications:
                                            old.specifications.filter(
                                                (_, i) => i !== index
                                            ),
                                    }))}
                                >
                                    <i className="fa-solid fa-trash" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Form Actions */}
                <div className="sp-form-footer">
                    <span>
                        <i className="fa-solid fa-circle-info" />
                        Frontend preview · New listings are submitted
                        for admin review.
                    </span>

                    <div>
                        <Button
                            component={Link}
                            to="/manage/products"
                            variant="outlined"
                            color="inherit"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={uploading}
                            startIcon={
                                <i className="fa-solid fa-floppy-disk" />
                            }
                        >
                            {original ? "Save Changes" : "Submit Product"}
                        </Button>
                    </div>
                </div>
            </form>
        </main>
    );
}

export default ProductForm;
