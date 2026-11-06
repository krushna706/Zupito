
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import {
    compressImage,
    getCategories,
    getProducts,
    getStoreName,
    saveSellerProduct,
} from "../services/sellerService";

// ================== FORM CONFIGURATION ==================
const MAX_STOCK = 999999;

const emptyVariant = () => ({
    id: crypto.randomUUID(),
    sku: "",
    label: "Standard",
    price: "",
    mrp: "",
    stock: "0",
    imageIndex: 0,
});

const emptySpec = () => ({
    label: "",
    value: "",
});

// ================== FORM HELPERS ==================
function initialForm(product) {
    const images = product?.images?.length
        ? product.images
        : product?.image
            ? [product.image]
            : [];

    return {
        name: product?.name || "",
        brand: product?.brand || "",
        group: product?.group || "",
        category: product?.category || "",
        images,
        description: product?.description?.map((item) => item.text)
            .join("\n\n") || "",
        highlights: product?.highlights?.join("\n") || "",
        specifications: product?.specifications?.map((item) => ({
            label: item.label,
            value: item.value,
        })) || [emptySpec()],
        variants: product?.variants?.length
            ? product.variants.map((variant) => ({
                id: variant.id,
                sku: variant.sku || "",
                label: variant.variantLabel ||
                    variant.options?.variant ||
                    "Standard",
                price: String(variant.price ?? ""),
                mrp: String(variant.mrp ?? ""),
                stock: String(variant.stock ?? 0),
                imageIndex: Math.max(
                    0,
                    images.indexOf(variant.image)
                ),
            }))
            : [emptyVariant()],
    };
}

function contentSignature(product) {
    return JSON.stringify({
        name: product.name,
        brand: product.brand,
        group: product.group,
        category: product.category,
        images: product.images?.length
            ? product.images
            : product.image
                ? [product.image]
                : [],
        description: (product.description || []).map((item) => item.text),
        highlights: product.highlights || [],
        specifications: product.specifications || [],
        variants: (product.variants || []).map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            label: variant.variantLabel ||
                variant.options?.variant ||
                "Standard",
            image: variant.image,
        })),
    });
}

function SectionHeading({ icon, title, description, action }) {
    return (
        <div className="sp-card-head">
            <span className="sp-section-icon">
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
            </span>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            {action}
        </div>
    );
}

// ================== PRODUCT FORM ==================
function ProductForm({ user }) {
    const { productId } = useParams();
    const navigate = useNavigate();

    const categories = useMemo(() => getCategories(), []);

    const original = useMemo(() => {
        if (!productId) return null;

        return getProducts().find((product) =>
            product.id === productId &&
            (
                (user?.id && product.sellerId === user.id) ||
                (
                    user?.email &&
                    product.sellerEmail?.toLowerCase() ===
                    user.email.toLowerCase()
                )
            )
        ) || null;
    }, [productId, user?.id, user?.email]);

    const [form, setForm] = useState(() => initialForm(original));
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [stockReason, setStockReason] = useState("");
    const [stockNote, setStockNote] = useState("");

    useEffect(() => {
        setForm(initialForm(original));
        setErrors({});
        setStockReason("");
        setStockNote("");
    }, [original]);

    const parents = categories.filter((category) =>
        !category.parentId && category.status === "Active"
    );

    const children = categories.filter((category) =>
        category.parentId === form.group &&
        category.status === "Active"
    );

    // ================== FIELD HANDLERS ==================
    const updateField = (name, value) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: "",
        }));
    };

    const changeCategory = (value) => {
        const selected = categories.find((item) =>
            item.slug === value
        );

        setForm((previous) => ({
            ...previous,
            category: value,
            specifications: previous.specifications.some(
                (item) => item.label || item.value
            )
                ? previous.specifications
                : selected?.attributes?.length
                    ? selected.attributes.map((label) => ({
                        label,
                        value: "",
                    }))
                    : [emptySpec()],
        }));

        setErrors((previous) => ({
            ...previous,
            category: "",
        }));
    };

    const changeVariant = (index, name, value) => {
        setForm((previous) => ({
            ...previous,
            variants: previous.variants.map((variant, position) =>
                position === index
                    ? { ...variant, [name]: value }
                    : variant
            ),
        }));
    };

    const changeSpecification = (index, name, value) => {
        setForm((previous) => ({
            ...previous,
            specifications: previous.specifications.map((item, position) =>
                position === index
                    ? { ...item, [name]: value }
                    : item
            ),
        }));
    };

    const addVariant = () => {
        setForm((previous) => ({
            ...previous,
            variants: [...previous.variants, emptyVariant()],
        }));
    };

    const removeVariant = (id) => {
        setForm((previous) => ({
            ...previous,
            variants: previous.variants.filter((item) =>
                item.id !== id
            ),
        }));
    };

    const addSpecification = () => {
        setForm((previous) => ({
            ...previous,
            specifications: [
                ...previous.specifications,
                emptySpec(),
            ],
        }));
    };

    const removeSpecification = (index) => {
        setForm((previous) => ({
            ...previous,
            specifications: previous.specifications.filter(
                (_, position) => position !== index
            ),
        }));
    };

    // ================== PRODUCT IMAGES ==================
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
            const images = await Promise.all(
                files.map(compressImage)
            );

            setForm((previous) => ({
                ...previous,
                images: [...previous.images, ...images],
            }));

            setErrors((previous) => ({
                ...previous,
                images: "",
            }));
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setForm((previous) => ({
            ...previous,
            images: previous.images.filter((_, position) =>
                position !== index
            ),
            variants: previous.variants.map((variant) => ({
                ...variant,
                imageIndex: variant.imageIndex > index
                    ? variant.imageIndex - 1
                    : variant.imageIndex === index
                        ? 0
                        : variant.imageIndex,
            })),
        }));
    };

    const setCoverImage = (index) => {
        setForm((previous) => {
            const images = [
                previous.images[index],
                ...previous.images.filter(
                    (_, position) => position !== index
                ),
            ];

            return {
                ...previous,
                images,
                variants: previous.variants.map((variant) => ({
                    ...variant,
                    imageIndex: Math.max(
                        0,
                        images.indexOf(
                            previous.images[variant.imageIndex]
                        )
                    ),
                })),
            };
        });
    };

    // ================== STOCK VALIDATION ==================
    const stockChanged = Boolean(
        original && form.variants.some((variant) => {
            const previous = original.variants?.find((item) =>
                String(item.id) === String(variant.id)
            );

            return previous &&
                Number(previous.stock || 0) !== Number(variant.stock);
        })
    );

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
            !children.some((item) => item.slug === form.category)
        ) {
            problems.category = "Select an active category.";
        }

        if (description.length < 20) {
            problems.description = "Write at least 20 characters.";
        }

        if (!form.images.length) {
            problems.images = "Upload at least one product image.";
        }

        if (specifications.some((item) =>
            !item.label || !item.value
        )) {
            problems.specifications = "Complete both specification fields.";
        }

        const skus = form.variants.map((variant) =>
            variant.sku.trim().toUpperCase()
        );

        const usedSkus = getProducts()
            .filter((product) =>
                product.id !== productId &&
                (
                    (user?.id && product.sellerId === user.id) ||
                    (
                        user?.email &&
                        product.sellerEmail?.toLowerCase() ===
                        user.email.toLowerCase()
                    )
                )
            )
            .flatMap((product) =>
                (product.variants || []).map((variant) =>
                    String(variant.sku || "").toUpperCase()
                )
            );

        if (
            new Set(skus).size !== skus.length ||
            skus.some((sku) => usedSkus.includes(sku))
        ) {
            problems.variants = "Each SKU must be unique across your products.";
        }

        const invalidVariant = form.variants.some((variant) => {
            const price = Number(variant.price);
            const mrp = Number(variant.mrp);
            const stock = Number(variant.stock);

            return (
                !/^[A-Z0-9_-]{3,30}$/.test(
                    variant.sku.trim().toUpperCase()
                ) ||
                !variant.label.trim() ||
                !Number.isFinite(price) ||
                price <= 0 ||
                !Number.isFinite(mrp) ||
                mrp < price ||
                !/^(0|[1-9]\d*)$/.test(variant.stock) ||
                !Number.isSafeInteger(stock) ||
                stock > MAX_STOCK
            );
        });

        if (invalidVariant) {
            problems.variants = problems.variants ||
                "Check SKU, variant, price, MRP and stock values.";
        }

        if (stockChanged && !stockReason) {
            problems.stockReason = "Select a stock movement reason.";
        }

        if (
            stockChanged &&
            stockReason !== "Restock" &&
            !stockNote.trim()
        ) {
            problems.stockNote = "Explain the stock correction.";
        }

        if (Object.keys(problems).length) {
            setErrors(problems);
            toast.error("Please correct the highlighted product details.");
            return;
        }

        // ================== PRODUCT RECORD ==================
        const variants = form.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku.trim().toUpperCase(),
            options: {
                variant: variant.label.trim(),
            },
            variantLabel: variant.label.trim(),
            price: Number(variant.price),
            mrp: Number(variant.mrp),
            stock: Number(variant.stock),
            image: form.images[variant.imageIndex] || form.images[0],
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
                (total, variant) => total + variant.stock,
                0
            ),
            variants,
            defaultVariantId: variants[0].id,
            optionGroups: [{
                key: "variant",
                label: "Variant",
                values: variants.map((variant) => ({
                    value: variant.variantLabel,
                    label: variant.variantLabel,
                })),
            }],
            highlights,
            description: [{
                title: "Product Details",
                text: description,
            }],
            specifications,
        };

        const now = new Date().toISOString();

        const contentChanged = original &&
            contentSignature(original) !== contentSignature(details);

        const requiresReview = contentChanged &&
            original?.status !== "Suspended";

        const status = original
            ? requiresReview
                ? "Pending"
                : original.status
            : "Pending";

        const product = {
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
                : contentChanged
                    ? "Content Update"
                    : original.reviewType,
            submittedAt: !original || requiresReview
                ? now
                : original.submittedAt,
            reviewedAt: requiresReview
                ? null
                : original?.reviewedAt || null,
            updatedAt: now,
            moderationReason: requiresReview
                ? ""
                : original?.moderationReason || "",
            history: requiresReview
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
            saveSellerProduct(user, product, stockReason, stockNote);

            toast.success(
                original
                    ? "Product updated successfully."
                    : "Product submitted for review."
            );

            navigate("/manage/products");
        } catch (error) {
            toast.error(error.message || "Unable to save product.");
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
            {/* ================== PAGE HEADER ================== */}
            <section className="sp-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-box-open"
                            aria-hidden="true"
                        />
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
                    startIcon={
                        <i className="fa-solid fa-arrow-left" />
                    }
                >
                    Back to Products
                </Button>
            </section>

            {/* ================== REVIEW STATUS ================== */}
            {original && (
                <div className="sp-notice">
                    <i
                        className="fa-solid fa-circle-info"
                        aria-hidden="true"
                    />

                    <span>
                        <strong>Status: {original.status}.</strong>{" "}
                        Price and stock updates retain the existing
                        approval status. Material content changes
                        require review.

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
                    {/* ================== PRODUCT DETAILS ================== */}
                    <section className="sp-card">
                        <SectionHeading
                            icon="fa-tag"
                            title="Product Information"
                            description="Basic listing details and category classification."
                        />

                        <div className="sp-fields">
                            <TextField
                                label="Product Name"
                                value={form.name}
                                onChange={(event) =>
                                    updateField("name", event.target.value)
                                }
                                error={Boolean(errors.name)}
                                helperText={errors.name}
                                className="sp-wide"
                                slotProps={{
                                    htmlInput: { maxLength: 120 },
                                }}
                                required
                            />

                            <TextField
                                label="Brand"
                                value={form.brand}
                                onChange={(event) =>
                                    updateField("brand", event.target.value)
                                }
                                error={Boolean(errors.brand)}
                                helperText={errors.brand}
                                required
                            />

                            <TextField
                                select
                                label="Main Category"
                                value={form.group}
                                onChange={(event) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        group: event.target.value,
                                        category: "",
                                    }));
                                }}
                                required
                            >
                                {parents.map((category) => (
                                    <MenuItem
                                        key={category.slug}
                                        value={category.slug}
                                    >
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Subcategory"
                                value={form.category}
                                onChange={(event) =>
                                    changeCategory(event.target.value)
                                }
                                error={Boolean(errors.category)}
                                helperText={errors.category}
                                disabled={!form.group}
                                className="sp-wide"
                                required
                            >
                                {children.map((category) => (
                                    <MenuItem
                                        key={category.slug}
                                        value={category.slug}
                                    >
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Product Description"
                                value={form.description}
                                onChange={(event) =>
                                    updateField("description", event.target.value)
                                }
                                error={Boolean(errors.description)}
                                helperText={
                                    errors.description ||
                                    `${form.description.length}/2000 characters`
                                }
                                slotProps={{
                                    htmlInput: { maxLength: 2000 },
                                }}
                                multiline
                                minRows={4}
                                className="sp-wide"
                                required
                            />

                            <TextField
                                label="Highlights (one per line)"
                                value={form.highlights}
                                onChange={(event) =>
                                    updateField("highlights", event.target.value)
                                }
                                helperText="Optional selling points"
                                slotProps={{
                                    htmlInput: { maxLength: 900 },
                                }}
                                multiline
                                minRows={3}
                                className="sp-wide"
                            />
                        </div>
                    </section>

                    {/* ================== PRODUCT IMAGES ================== */}
                    <section className="sp-card">
                        <SectionHeading
                            icon="fa-images"
                            title="Product Images"
                            description="Upload up to 4 images. The first image is the cover."
                        />

                        <label className="sp-upload">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                hidden
                                disabled={uploading || form.images.length >= 4}
                                onChange={uploadImages}
                            />

                            <i
                                className="fa-solid fa-cloud-arrow-up"
                                aria-hidden="true"
                            />

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
                                <div
                                    className="sp-image-tile"
                                    key={index}
                                >
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
                                                onClick={() =>
                                                    setCoverImage(index)
                                                }
                                            >
                                                <i className="fa-solid fa-star" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            title="Remove image"
                                            onClick={() =>
                                                removeImage(index)
                                            }
                                        >
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ================== PRODUCT VARIANTS ================== */}
                <section className="sp-card sp-form-section">
                    <SectionHeading
                        icon="fa-layer-group"
                        title="Product Variants"
                        description="Manage each SKU, price, MRP and available stock."
                        action={
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={addVariant}
                                startIcon={
                                    <i className="fa-solid fa-plus" />
                                }
                            >
                                Add Variant
                            </Button>
                        }
                    />

                    {errors.variants && (
                        <p className="sp-error">{errors.variants}</p>
                    )}

                    {/* ================== STOCK CHANGE DETAILS ================== */}
                    {stockChanged && (
                        <div className="sp-stock-audit">
                            <div>
                                <strong>Stock Change Details</strong>
                                <p>
                                    Stock edits are recorded in Inventory
                                    History, not counted as sales.
                                </p>
                            </div>

                            <div className="sp-stock-audit-fields">
                                <TextField
                                    select
                                    size="small"
                                    label="Movement Type"
                                    value={stockReason}
                                    onChange={(event) => {
                                        setStockReason(event.target.value);
                                        setErrors((previous) => ({
                                            ...previous,
                                            stockReason: "",
                                        }));
                                    }}
                                    error={Boolean(errors.stockReason)}
                                    helperText={errors.stockReason || " "}
                                    required
                                >
                                    <MenuItem value="Restock">
                                        Restock / Received
                                    </MenuItem>
                                    <MenuItem value="Adjustment">
                                        Stock Count Correction
                                    </MenuItem>
                                    <MenuItem value="Damage/Loss">
                                        Damage / Loss
                                    </MenuItem>
                                </TextField>

                                <TextField
                                    size="small"
                                    label="Reason / Reference"
                                    value={stockNote}
                                    onChange={(event) => {
                                        setStockNote(event.target.value);
                                        setErrors((previous) => ({
                                            ...previous,
                                            stockNote: "",
                                        }));
                                    }}
                                    error={Boolean(errors.stockNote)}
                                    helperText={errors.stockNote || " "}
                                    required={stockReason !== "Restock"}
                                    slotProps={{
                                        htmlInput: { maxLength: 150 },
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="sp-variant-list">
                        {form.variants.map((variant, index) => {
                            const existing = original?.variants?.find((item) =>
                                String(item.id) === String(variant.id)
                            );

                            const reserved = Number(
                                existing?.reservedStock ??
                                existing?.reservedQuantity ??
                                0
                            );

                            const cannotRemove = Boolean(
                                existing &&
                                (
                                    Number(existing.stock || 0) > 0 ||
                                    reserved > 0
                                )
                            );

                            return (
                                <div
                                    className="sp-variant"
                                    key={variant.id}
                                >
                                    <div className="sp-variant-head">
                                        <strong>Variant {index + 1}</strong>

                                        <Button
                                            type="button"
                                            color="error"
                                            size="small"
                                            disabled={
                                                form.variants.length === 1 ||
                                                cannotRemove
                                            }
                                            title={
                                                cannotRemove
                                                    ? "Set stock to zero before removal"
                                                    : "Remove variant"
                                            }
                                            onClick={() =>
                                                removeVariant(variant.id)
                                            }
                                        >
                                            Remove
                                        </Button>
                                    </div>

                                    <div className="sp-variant-fields">
                                        <TextField
                                            label="SKU"
                                            value={variant.sku}
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "sku",
                                                    event.target.value.toUpperCase()
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: { maxLength: 30 },
                                            }}
                                            required
                                        />

                                        <TextField
                                            label="Variant (Size / Colour / Pack)"
                                            value={variant.label}
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "label",
                                                    event.target.value
                                                )
                                            }
                                            required
                                        />

                                        <TextField
                                            label="Selling Price (₹)"
                                            type="number"
                                            value={variant.price}
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "price",
                                                    event.target.value
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: {
                                                    min: 1,
                                                    step: "0.01",
                                                },
                                            }}
                                            required
                                        />

                                        <TextField
                                            label="MRP (₹)"
                                            type="number"
                                            value={variant.mrp}
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "mrp",
                                                    event.target.value
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: {
                                                    min: 1,
                                                    step: "0.01",
                                                },
                                            }}
                                            required
                                        />

                                        <TextField
                                            label="On-Hand Stock"
                                            type="number"
                                            value={variant.stock}
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "stock",
                                                    event.target.value
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: {
                                                    min: 0,
                                                    max: MAX_STOCK,
                                                    step: 1,
                                                },
                                            }}
                                            required
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
                                            onChange={(event) =>
                                                changeVariant(
                                                    index,
                                                    "imageIndex",
                                                    Number(event.target.value)
                                                )
                                            }
                                            disabled={!form.images.length}
                                        >
                                            {form.images.map((_, position) => (
                                                <MenuItem
                                                    key={position}
                                                    value={String(position)}
                                                >
                                                    {position === 0
                                                        ? "Cover Image"
                                                        : `Image ${position + 1}`}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ================== SPECIFICATIONS ================== */}
                <section className="sp-card sp-form-section">
                    <SectionHeading
                        icon="fa-list"
                        title="Specifications"
                        description="Provide relevant technical or product attributes."
                        action={
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={addSpecification}
                                startIcon={
                                    <i className="fa-solid fa-plus" />
                                }
                            >
                                Add Specification
                            </Button>
                        }
                    />

                    {errors.specifications && (
                        <p className="sp-error">
                            {errors.specifications}
                        </p>
                    )}

                    <div className="sp-spec-list">
                        {form.specifications.map((specification, index) => (
                            <div
                                className="sp-spec-row"
                                key={index}
                            >
                                <TextField
                                    label="Attribute"
                                    value={specification.label}
                                    onChange={(event) =>
                                        changeSpecification(
                                            index,
                                            "label",
                                            event.target.value
                                        )
                                    }
                                />

                                <TextField
                                    label="Value"
                                    value={specification.value}
                                    onChange={(event) =>
                                        changeSpecification(
                                            index,
                                            "value",
                                            event.target.value
                                        )
                                    }
                                />

                                <Button
                                    type="button"
                                    color="error"
                                    disabled={
                                        form.specifications.length === 1
                                    }
                                    onClick={() =>
                                        removeSpecification(index)
                                    }
                                >
                                    <i className="fa-solid fa-trash" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ================== FORM ACTIONS ================== */}
                <div className="sp-form-footer">
                    <span>
                        <i className="fa-solid fa-circle-info" />
                        Frontend preview · New listings require admin review.
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
