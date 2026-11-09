import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField
} from "@mui/material";
import { toast } from "react-toastify";

import {
    addressTypes,
    emptyAddress,
    getAddresses,
    normalizeAddress,
    removeAddress,
    saveAddress,
    setDefaultAddress,
    validateAddress
} from "../services/userService";

const addressFields = [
    { name: "name", label: "Full Name", autoComplete: "name", maxLength: 80 },
    { name: "phone", label: "Mobile Number", autoComplete: "tel", maxLength: 10, numeric: true },
    { name: "pincode", label: "PIN Code", autoComplete: "postal-code", maxLength: 6, numeric: true },
    { name: "type", label: "Address Type", select: true },
    { name: "house", label: "House / Flat / Building", autoComplete: "address-line1", full: true },
    { name: "area", label: "Street / Area / Locality", autoComplete: "address-line2", full: true },
    { name: "city", label: "City", autoComplete: "address-level2", maxLength: 80 },
    { name: "state", label: "State", autoComplete: "address-level1", maxLength: 80 },
    { name: "landmark", label: "Landmark (Optional)", full: true }
];

function getAddressIcon(type) {
    if (type === "Home") return "fa-house";
    if (type === "Work") return "fa-briefcase";

    return "fa-location-dot";
}

function Addresses() {
    const [addressData, setAddressData] = useState({
        addresses: [],
        selectedId: null,
        version: 0
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(emptyAddress);
    const [formErrors, setFormErrors] = useState({});
    const [deleteAddress, setDeleteAddress] = useState(null);

    const busy = useRef(false);
    const mounted = useRef(false);
    const generation = useRef(0);

    const { addresses, selectedId } = addressData;

    const sortedAddresses = [...addresses].sort(
        (a, b) =>
            Number(b.id === selectedId) -
            Number(a.id === selectedId)
    );

    const refresh = useCallback(async () => {
        if (busy.current) return;

        const request = ++generation.current;
        setLoading(true);

        try {
            const data = await getAddresses();

            if (mounted.current && request === generation.current) {
                setAddressData(data);
                setError("");
            }
        } catch (failure) {
            if (mounted.current && request === generation.current) {
                setError(failure.message);
            }
        } finally {
            if (mounted.current && request === generation.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        refresh();

        window.addEventListener("focus", refresh);

        return () => {
            mounted.current = false;
            generation.current += 1;
            window.removeEventListener("focus", refresh);
        };
    }, [refresh]);

    const mutate = async (operation) => {
        if (busy.current || loading || error) return null;

        busy.current = true;
        generation.current += 1;
        setSaving(true);

        try {
            const data = await operation();

            if (!mounted.current) return null;

            setAddressData(data);
            return data;
        } catch (failure) {
            if (mounted.current) toast.error(failure.message);

            busy.current = false;

            if (mounted.current) await refresh();

            return null;
        } finally {
            busy.current = false;

            if (mounted.current) setSaving(false);
        }
    };

    const openAddForm = () => {
        setEditingId(null);
        setFormData({ ...emptyAddress });
        setFormErrors({});
        setFormOpen(true);
    };

    const openEditForm = (address) => {
        setEditingId(address.id);
        setFormData(normalizeAddress(address));
        setFormErrors({});
        setFormOpen(true);
    };

    const closeForm = () => {
        if (busy.current) return;

        setFormOpen(false);
        setEditingId(null);
        setFormErrors({});
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        let nextValue = value;

        if (name === "phone") {
            nextValue = value.replace(/\D/g, "").slice(0, 10);
        }

        if (name === "pincode") {
            nextValue = value.replace(/\D/g, "").slice(0, 6);
        }

        setFormData((previous) => ({
            ...previous,
            [name]: nextValue
        }));

        setFormErrors((previous) => ({
            ...previous,
            [name]: ""
        }));
    };

    const handleSaveAddress = async (event) => {
        event.preventDefault();

        const normalized = normalizeAddress(formData);
        const errors = validateAddress(normalized);

        if (Object.keys(errors).length) {
            setFormErrors(errors);
            return;
        }

        const result = await mutate(() =>
            saveAddress(
                { ...normalized, id: editingId },
                addressData.version
            )
        );

        if (!result) return;

        toast.success(
            editingId
                ? "Address updated successfully."
                : "Address added successfully."
        );

        closeForm();
    };

    const handleSetDefault = async (addressId) => {
        if (addressId === selectedId) return;

        const result = await mutate(() =>
            setDefaultAddress(addressId, addressData.version)
        );

        if (result) {
            toast.success("Default delivery address updated.");
        }
    };

    const handleDeleteAddress = async () => {
        if (!deleteAddress) return;

        const result = await mutate(() =>
            removeAddress(deleteAddress.id, addressData.version)
        );

        if (!result) return;

        setDeleteAddress(null);
        toast.success("Address deleted successfully.");
    };

    return (
        <div className="customer-addresses-page">
            {/* Page Heading */}
            <div className="customer-addresses-heading">
                <div>
                    <span className="customer-addresses-eyebrow">
                        DELIVERY LOCATIONS
                    </span>
                    <h2>Saved Addresses</h2>
                    <p>
                        Add and manage delivery addresses for a faster checkout experience.
                    </p>
                </div>

                <button
                    disabled={saving || loading || Boolean(error)}
                    type="button"
                    className="customer-addresses-add-button"
                    onClick={openAddForm}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Add New Address
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}{" "}
                    <button
                        type="button"
                        className="btn btn-link"
                        onClick={refresh}
                        disabled={loading || saving}
                    >
                        Retry
                    </button>
                </div>
            )}

            {loading && <p role="status">Loading addresses…</p>}

            {/* Address Summary */}
            <div className="customer-addresses-summary">
                <span className="customer-addresses-summary-icon">
                    <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                </span>

                <div>
                    <strong>
                        {addresses.length} Saved{" "}
                        {addresses.length === 1 ? "Address" : "Addresses"}
                    </strong>
                    <p>
                        Choose your preferred delivery location and keep your address details updated.
                    </p>
                </div>

                <span className="customer-addresses-summary-decoration">
                    <i className="fa-solid fa-location-dot" aria-hidden="true" />
                </span>
            </div>

            {/* Saved Address Cards */}
            {!loading && !error && (
                addresses.length === 0 ? (
                    <div className="customer-addresses-empty">
                        <span className="customer-addresses-empty-icon">
                            <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                        </span>

                        <h3>No saved addresses yet</h3>
                        <p>
                            Add your first delivery address to make checkout faster and more convenient.
                        </p>

                        <button
                            disabled={saving || loading || Boolean(error)}
                            type="button"
                            onClick={openAddForm}
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Add Your First Address
                        </button>
                    </div>
                ) : (
                    <div className="customer-addresses-grid">
                        {sortedAddresses.map((address) => {
                            const isDefault = address.id === selectedId;

                            return (
                                <article
                                    key={address.id}
                                    className={`customer-address-card ${
                                        isDefault ? "is-default" : ""
                                    }`}
                                >
                                    <div className="customer-address-card-header">
                                        <div className="customer-address-card-type">
                                            <span>
                                                <i
                                                    className={`fa-solid ${getAddressIcon(address.type)}`}
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <strong>{address.type || "Other"}</strong>
                                        </div>

                                        {isDefault && (
                                            <span className="customer-address-default-badge">
                                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                                Default Address
                                            </span>
                                        )}
                                    </div>

                                    <div className="customer-address-card-body">
                                        <h3>{address.name}</h3>

                                        <p className="customer-address-card-phone">
                                            <i className="fa-solid fa-phone" aria-hidden="true" />
                                            {address.phone}
                                        </p>

                                        <div className="customer-address-card-location">
                                            <i className="fa-solid fa-location-dot" aria-hidden="true" />

                                            <p>
                                                {address.house}, {address.area}
                                                {address.landmark ? `, ${address.landmark}` : ""}
                                                <span>
                                                    {address.city}, {address.state}
                                                </span>
                                                <span>PIN: {address.pincode}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="customer-address-card-footer">
                                        <div className="customer-address-card-tools">
                                            <button
                                                disabled={saving || loading || Boolean(error)}
                                                type="button"
                                                className="customer-address-edit"
                                                onClick={() => openEditForm(address)}
                                            >
                                                <i className="fa-solid fa-pen" aria-hidden="true" />
                                                Edit
                                            </button>

                                            <button
                                                disabled={saving || loading || Boolean(error)}
                                                type="button"
                                                className="customer-address-delete"
                                                onClick={() => setDeleteAddress(address)}
                                            >
                                                <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                                Delete
                                            </button>
                                        </div>

                                        {!isDefault && (
                                            <button
                                                disabled={saving || loading || Boolean(error)}
                                                type="button"
                                                className="customer-address-set-default"
                                                onClick={() => handleSetDefault(address.id)}
                                            >
                                                Set as Default
                                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )
            )}

            {/* Important Information */}
            <div className="customer-addresses-info">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <p>
                    Your default address is preselected at checkout. Updating a saved address
                    will not change delivery details on an existing order.
                </p>
            </div>

            {/* Add / Edit Dialog */}
            <Dialog
                open={formOpen}
                onClose={closeForm}
                fullWidth
                maxWidth="sm"
                className="customer-address-dialog"
                aria-labelledby="customer-address-dialog-title"
            >
                <DialogTitle id="customer-address-dialog-title">
                    <span className="customer-address-dialog-heading">
                        <span className="customer-address-dialog-icon">
                            <i
                                className={`fa-solid ${
                                    editingId !== null ? "fa-pen-to-square" : "fa-location-dot"
                                }`}
                                aria-hidden="true"
                            />
                        </span>

                        <span>
                            <strong>
                                {editingId !== null ? "Edit Address" : "Add New Address"}
                            </strong>
                            <small>Fill in your delivery information below.</small>
                        </span>
                    </span>
                </DialogTitle>

                <DialogContent dividers>
                    <form
                        id="customer-address-form"
                        onSubmit={handleSaveAddress}
                        noValidate
                    >
                        <div className="customer-address-form-grid">
                            {addressFields.map((field) => (
                                <TextField
                                    key={field.name}
                                    disabled={saving}
                                    select={Boolean(field.select)}
                                    label={field.label}
                                    name={field.name}
                                    value={formData[field.name]}
                                    onChange={handleInputChange}
                                    error={Boolean(formErrors[field.name])}
                                    helperText={formErrors[field.name]}
                                    autoComplete={field.autoComplete}
                                    required={field.name !== "landmark"}
                                    fullWidth
                                    size="small"
                                    className={
                                        field.full ? "customer-address-form-full" : undefined
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: field.maxLength || 150,
                                            inputMode: field.numeric ? "numeric" : "text"
                                        }
                                    }}
                                >
                                    {field.select && addressTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            ))}
                        </div>
                    </form>
                </DialogContent>

                <DialogActions className="customer-address-dialog-actions">
                    <button
                        disabled={saving}
                        type="button"
                        className="customer-address-dialog-cancel"
                        onClick={closeForm}
                    >
                        Cancel
                    </button>

                    <button
                        disabled={saving || loading || Boolean(error)}
                        type="submit"
                        form="customer-address-form"
                        className="customer-address-dialog-save"
                    >
                        <i className="fa-solid fa-check" aria-hidden="true" />
                        {editingId !== null ? "Update Address" : "Save Address"}
                    </button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog
                open={Boolean(deleteAddress)}
                onClose={() => {
                    if (!saving) setDeleteAddress(null);
                }}
                fullWidth
                maxWidth="xs"
                className="customer-address-delete-dialog"
                aria-labelledby="customer-address-delete-title"
            >
                <DialogTitle id="customer-address-delete-title">
                    Delete Address?
                </DialogTitle>

                <DialogContent>
                    <p className="customer-address-delete-message">
                        Are you sure you want to delete this saved address?
                        This action cannot be undone.
                    </p>
                </DialogContent>

                <DialogActions className="customer-address-dialog-actions">
                    <button
                        disabled={saving}
                        type="button"
                        className="customer-address-dialog-cancel"
                        onClick={() => setDeleteAddress(null)}
                    >
                        Keep Address
                    </button>

                    <button
                        disabled={saving || loading || Boolean(error)}
                        type="button"
                        className="customer-address-dialog-delete"
                        onClick={handleDeleteAddress}
                    >
                        Delete Address
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Addresses;