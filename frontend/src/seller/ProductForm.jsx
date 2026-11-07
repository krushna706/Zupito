import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import {
    fetchProductCategories,
    fetchSellerProduct,
    submitSellerProduct,
} from "../services/sellerService";

const emptyVariant = () => ({
    variantId: crypto.randomUUID(),
    sku: "",
    label: "Standard",
    price: "",
    mrp: "",
    stock: "0",
    imageIndex: 0,
});

const emptyForm = () => ({
    name: "",
    brand: "",
    categoryId: "",
    description: "",
    highlights: "",
    specifications: [],
    variants: [emptyVariant()],
});

function Heading({ title, description, action }) {
    return (
        <div className="sp-card-head">
            <span className="sp-section-icon"><i className="fa-solid fa-box-open" /></span>
            <div><h2>{title}</h2><p>{description}</p></div>
            {action}
        </div>
    );
}

function ProductForm() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const previewUrls = useRef(new Set());

    const [categories, setCategories] = useState([]);
    const [original, setOriginal] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [images, setImages] = useState([]);
    const [stockReason, setStockReason] = useState("");
    const [stockNote, setStockNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const urls = previewUrls.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setLoadError("");

        Promise.all([
            fetchProductCategories(controller.signal),
            productId ? fetchSellerProduct(productId, controller.signal) : null,
        ]).then(([categoryRows, product]) => {
            if (!active) return;

            previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
            previewUrls.current.clear();

            setCategories(categoryRows);
            setOriginal(product);
            setImages(product?.images || []);
            setStockReason("");
            setStockNote("");
            setError("");

            setForm(product ? {
                name: product.name,
                brand: product.brand,
                categoryId: product.categoryId,
                description: product.description,
                highlights: product.highlights.join("\n"),
                specifications: product.specifications,
                variants: product.variants.map((variant) => ({
                    ...variant,
                    price: String(variant.pricePaise / 100),
                    mrp: String(variant.mrpPaise / 100),
                    stock: String(variant.stock),
                })),
            } : emptyForm());
        }).catch((failure) => {
            if (active) setLoadError(failure.message);
        }).finally(() => {
            if (active) setLoading(false);
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [productId, revision]);

    const changeField = (name, value) => {
        setForm((previous) => ({ ...previous, [name]: value }));
        setError("");
    };

    const changeVariant = (index, name, value) => {
        setForm((previous) => ({
            ...previous,
            variants: previous.variants.map((variant, position) =>
                position === index ? { ...variant, [name]: value } : variant
            ),
        }));
        setError("");
    };

    const changeCategory = (categoryId) => {
        const category = categories.find((item) => item._id === categoryId);

        setForm((previous) => {
            const specifications = [...previous.specifications];
            const labels = new Set(specifications.map((item) => item.label.toLowerCase()));

            for (const label of category?.attributes || []) {
                if (!labels.has(label.toLowerCase())) {
                    specifications.push({ label, value: "" });
                }
            }

            return { ...previous, categoryId, specifications };
        });
    };

    const addImages = (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";

        if (files.length + images.length > 4) {
            toast.error("Maximum four product images allowed.");
            return;
        }

        if (files.some((file) =>
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            !file.size ||
            file.size > 3 * 1024 * 1024
        )) {
            toast.error("Use valid JPG, PNG or WebP images up to 3 MB each.");
            return;
        }

        const additions = files.map((file) => {
            const url = URL.createObjectURL(file);
            previewUrls.current.add(url);
            return { url, file };
        });

        setImages((previous) => [...previous, ...additions]);
    };

    const removeImage = (index) => {
        const removed = images[index];

        if (removed.file) {
            URL.revokeObjectURL(removed.url);
            previewUrls.current.delete(removed.url);
        }

        setImages((previous) => previous.filter((_, position) => position !== index));
        setForm((previous) => ({
            ...previous,
            variants: previous.variants.map((variant) => ({
                ...variant,
                imageIndex: variant.imageIndex === index
                    ? 0
                    : variant.imageIndex > index ? variant.imageIndex - 1 : variant.imageIndex,
            })),
        }));
    };

    const setCover = (index) => {
        const next = [images[index], ...images.filter((_, position) => position !== index)];

        setForm((previous) => ({
            ...previous,
            variants: previous.variants.map((variant) => ({
                ...variant,
                imageIndex: next.indexOf(images[variant.imageIndex]),
            })),
        }));
        setImages(next);
    };

    const stockChanged = Boolean(original && form.variants.some((variant) => {
        const old = original.variants.find((item) => item.variantId === variant.variantId);
        return old && old.stock !== Number(variant.stock);
    }));

    const save = async (event) => {
        event.preventDefault();
        if (saving) return;

        const validMoney = (value) => /^\d+(\.\d{1,2})?$/.test(value);

        if (
            !images.length ||
            form.variants.some((variant) =>
                !validMoney(variant.price) ||
                !validMoney(variant.mrp) ||
                !/^\d+$/.test(variant.stock)
            )
        ) {
            setError("Add an image and check variant price, MRP and stock values.");
            return;
        }

        const values = {
            name: form.name.trim(),
            brand: form.brand.trim(),
            categoryId: form.categoryId,
            description: form.description.trim(),
            highlights: form.highlights.split("\n").map((item) => item.trim()).filter(Boolean),
            specifications: form.specifications
                .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
                .filter((item) => item.label || item.value),
            variants: form.variants.map((variant) => ({
                variantId: variant.variantId,
                sku: variant.sku.trim().toUpperCase(),
                label: variant.label.trim(),
                pricePaise: Math.round(Number(variant.price) * 100),
                mrpPaise: Math.round(Number(variant.mrp) * 100),
                stock: Number(variant.stock),
                imageIndex: Number(variant.imageIndex),
            })),
            stockReason,
            stockNote: stockNote.trim(),
            ...(original ? { version: original.__v } : {}),
        };

        setSaving(true);
        setError("");

        try {
            const result = await submitSellerProduct(productId, values, images);
            toast.success(result.message);
            navigate("/manage/products");
        } catch (failure) {
            setError(failure.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <main className="seller-product-page"><p role="status">Loading product form...</p></main>;
    }

    if (loadError) {
        return (
            <main className="seller-product-page">
                <Alert severity="error">{loadError}</Alert>
                <Button onClick={() => setRevision((value) => value + 1)}>Retry</Button>
                <Button component={Link} to="/manage/products">Back to Products</Button>
            </main>
        );
    }

    const subcategories = categories.filter((item) => item.parentId);
    const parentName = (id) => categories.find((item) => item._id === id)?.name || "";

    return (
        <main className="seller-product-page">
            <section className="sp-hero">
                <div>
                    <h1><i className="fa-solid fa-box-open" /> {original ? "EDIT PRODUCT" : "ADD PRODUCT"}</h1>
                    <p>Manage listing details, images, variants and stock.</p>
                </div>
                <Button component={Link} to="/manage/products" disabled={saving}>Back to Products</Button>
            </section>

            {original?.moderationReason && (
                <Alert severity="warning">{original.moderationReason}</Alert>
            )}

            <form onSubmit={save} noValidate>
                <div className="sp-form-grid">
                    <section className="sp-card">
                        <Heading title="Product Information" description="Basic listing details and category classification." />
                        <div className="sp-fields">
                            <TextField label="Product Name" className="sp-wide" value={form.name} onChange={(e) => changeField("name", e.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} disabled={saving} fullWidth />
                            <TextField label="Brand" value={form.brand} onChange={(e) => changeField("brand", e.target.value)} slotProps={{ htmlInput: { maxLength: 80 } }} disabled={saving} fullWidth />
                            <TextField select label="Subcategory" value={form.categoryId} onChange={(e) => changeCategory(e.target.value)} disabled={saving} fullWidth>
                                <MenuItem value="">Select Subcategory</MenuItem>
                                {subcategories.map((category) => (
                                    <MenuItem key={category._id} value={category._id} disabled={!category.available}>
                                        {parentName(category.parentId)} / {category.name}{!category.available ? " (Disabled)" : ""}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField label="Product Description" className="sp-wide" value={form.description} onChange={(e) => changeField("description", e.target.value)} multiline minRows={4} slotProps={{ htmlInput: { maxLength: 5000 } }} disabled={saving} fullWidth />
                            <TextField label="Highlights (one per line)" className="sp-wide" value={form.highlights} onChange={(e) => changeField("highlights", e.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 2010 } }} disabled={saving} fullWidth />
                        </div>
                    </section>

                    <section className="sp-card">
                        <Heading title="Product Images" description="Up to four images, 3 MB each. First image is the cover." />
                        <label className="sp-upload">
                            <i className="fa-solid fa-cloud-arrow-up" />
                            Select Images
                            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple hidden onChange={addImages} disabled={saving || images.length >= 4} />
                        </label>

                        <div className="sp-image-grid">
                            {images.map((image, index) => (
                                <div className="sp-image-tile" key={image.publicId || image.url}>
                                    <img src={image.url} alt={`Product ${index + 1}`} />
                                    <div>
                                        <button type="button" title="Set as cover" onClick={() => setCover(index)} disabled={saving || index === 0}>
                                            <i className="fa-solid fa-star" />
                                        </button>
                                        <button type="button" title="Remove image" onClick={() => removeImage(index)} disabled={saving}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="sp-card sp-form-section">
                    <Heading
                        title="Product Variants"
                        description="Each SKU has its own price, stock and image."
                        action={
                            <Button disabled={saving || form.variants.length >= 50} onClick={() => changeField("variants", [...form.variants, emptyVariant()])}>
                                Add Variant
                            </Button>
                        }
                    />

                    <div className="sp-variant-list">
                        {form.variants.map((variant, index) => {
                            const old = original?.variants.find((item) => item.variantId === variant.variantId);
                            const canRemove = form.variants.length > 1 &&
                                (!old || (!old.stock && !old.reservedQuantity));

                            return (
                                <div className="sp-variant" key={variant.variantId}>
                                    <div className="sp-variant-head">
                                        <strong>Variant {index + 1}</strong>
                                        <Button disabled={saving || !canRemove} color="error" onClick={() => changeField("variants", form.variants.filter((item) => item.variantId !== variant.variantId))}>
                                            Remove
                                        </Button>
                                    </div>

                                    <div className="sp-variant-fields">
                                        <TextField label="SKU" value={variant.sku} onChange={(e) => changeVariant(index, "sku", e.target.value.toUpperCase())} disabled={saving || Boolean(old)} slotProps={{ htmlInput: { maxLength: 30 } }} />
                                        <TextField label="Variant (Size / Colour / Pack)" value={variant.label} onChange={(e) => changeVariant(index, "label", e.target.value)} disabled={saving} slotProps={{ htmlInput: { maxLength: 80 } }} />
                                        <TextField label="Selling Price (₹)" value={variant.price} onChange={(e) => changeVariant(index, "price", e.target.value)} disabled={saving} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                                        <TextField label="MRP (₹)" value={variant.mrp} onChange={(e) => changeVariant(index, "mrp", e.target.value)} disabled={saving} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
                                        <TextField label="On-Hand Stock" value={variant.stock} onChange={(e) => changeVariant(index, "stock", e.target.value)} helperText={`Reserved: ${old?.reservedQuantity || 0}`} disabled={saving} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
                                        <TextField select label="Variant Image" value={images.length ? variant.imageIndex : ""} onChange={(e) => changeVariant(index, "imageIndex", Number(e.target.value))} disabled={saving || !images.length}>
                                            {images.map((_, imageIndex) => (
                                                <MenuItem key={imageIndex} value={imageIndex}>Image {imageIndex + 1}</MenuItem>
                                            ))}
                                        </TextField>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {stockChanged && (
                        <div className="sp-stock-audit">
                            <div className="sp-stock-audit-fields">
                                <TextField select label="Movement Type" value={stockReason} onChange={(e) => setStockReason(e.target.value)} disabled={saving}>
                                    <MenuItem value="">Select Reason</MenuItem>
                                    {["Restock", "Adjustment", "Damage/Loss"].map((item) => (
                                        <MenuItem key={item} value={item}>{item}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField label="Reason / Reference" value={stockNote} onChange={(e) => setStockNote(e.target.value)} disabled={saving} slotProps={{ htmlInput: { maxLength: 300 } }} fullWidth />
                            </div>
                        </div>
                    )}
                </section>

                <section className="sp-card sp-form-section">
                    <Heading
                        title="Specifications"
                        description="Complete the attributes required by the selected category."
                        action={
                            <Button disabled={saving || form.specifications.length >= 30} onClick={() => changeField("specifications", [...form.specifications, { label: "", value: "" }])}>
                                Add Specification
                            </Button>
                        }
                    />
                    <div className="sp-spec-list">
                        {form.specifications.map((item, index) => (
                            <div className="sp-spec-row" key={index}>
                                <TextField label="Attribute" value={item.label} disabled={saving} slotProps={{ htmlInput: { maxLength: 40 } }} onChange={(e) => changeField("specifications", form.specifications.map((row, position) => position === index ? { ...row, label: e.target.value } : row))} />
                                <TextField label="Value" value={item.value} disabled={saving} slotProps={{ htmlInput: { maxLength: 500 } }} onChange={(e) => changeField("specifications", form.specifications.map((row, position) => position === index ? { ...row, value: e.target.value } : row))} />
                                <Button color="error" disabled={saving} onClick={() => changeField("specifications", form.specifications.filter((_, position) => position !== index))}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {error && <Alert severity="error">{error}</Alert>}

                <div className="sp-form-footer">
                    <p>New listings and content changes require review. Price and stock changes preserve the current review status.</p>
                    <Button type="submit" variant="contained" disabled={saving}>
                        {saving ? "Saving..." : original ? "Save Changes" : "Submit Product"}
                    </Button>
                </div>
            </form>
        </main>
    );
}

export default ProductForm;