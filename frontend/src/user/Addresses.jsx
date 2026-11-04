
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

const STORAGE_KEY = "zupito_delivery_addresses";

const emptyAddress = {
    name: "",
    phone: "",
    pincode: "",
    house: "",
    area: "",
    city: "",
    state: "",
    landmark: "",
    type: "Home",
};

const addressTypes = ["Home", "Work", "Other"];

// ================== ADDRESS HELPERS ==================
function getStoredAddresses() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "null"
        );

        if (!stored || !Array.isArray(stored.addresses)) {
            return {
                addresses: [],
                selectedId: null,
            };
        }

        const addresses = stored.addresses.filter(
            (address) =>
                address &&
                typeof address === "object" &&
                address.id
        );

        const selectedId = addresses.some(
            (address) => address.id === stored.selectedId
        )
            ? stored.selectedId
            : addresses[0]?.id || null;

        return { addresses, selectedId };
    } catch {
        return {
            addresses: [],
            selectedId: null,
        };
    }
}

function validateAddress(address) {
    const errors = {};

    if (address.name.length < 2 || address.name.length > 80) {
        errors.name = "Enter a valid name (2–80 characters).";
    }

    if (!/^[6-9]\d{9}$/.test(address.phone)) {
        errors.phone = "Enter a valid 10-digit mobile number.";
    }

    if (!/^\d{6}$/.test(address.pincode)) {
        errors.pincode = "Enter a valid 6-digit PIN code.";
    }

    if (address.house.length < 2) {
        errors.house = "Enter house, building or flat details.";
    }

    if (address.area.length < 2) {
        errors.area = "Enter your street or area.";
    }

    if (address.city.length < 2) {
        errors.city = "Enter a valid city.";
    }

    if (address.state.length < 2) {
        errors.state = "Enter a valid state.";
    }

    if (!addressTypes.includes(address.type)) {
        errors.type = "Select an address type.";
    }

    return errors;
}

function getAddressIcon(type) {
    if (type === "Home") return "fa-house";
    if (type === "Work") return "fa-briefcase";

    return "fa-location-dot";
}

function createAddressId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `address-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

// ================== SAVED ADDRESSES ==================
function Addresses() {
    const [addressData, setAddressData] = useState(getStoredAddresses);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(emptyAddress);
    const [formErrors, setFormErrors] = useState({});
    const [deleteAddress, setDeleteAddress] = useState(null);

    const { addresses, selectedId } = addressData;

    const sortedAddresses = [...addresses].sort(
        (a, b) =>
            Number(b.id === selectedId) -
            Number(a.id === selectedId)
    );

    // Sync address changes from other browser tabs.
    useEffect(() => {
        const syncAddresses = (event) => {
            if (event.key === STORAGE_KEY || event.key === null) {
                setAddressData(getStoredAddresses());
            }
        };

        window.addEventListener("storage", syncAddresses);

        return () => {
            window.removeEventListener("storage", syncAddresses);
        };
    }, []);

    // ================== SAVE TO STORAGE ==================
    const saveAddressData = (nextData) => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextData)
            );

            setAddressData(nextData);
            return true;
        } catch {
            toast.error("Unable to save addresses. Please try again.");
            return false;
        }
    };

    // ================== ADDRESS FORM ==================
    const openAddForm = () => {
        setEditingId(null);
        setFormData({ ...emptyAddress });
        setFormErrors({});
        setFormOpen(true);
    };

    const openEditForm = (address) => {
        setEditingId(address.id);

        setFormData({
            name: address.name || "",
            phone: address.phone || "",
            pincode: address.pincode || "",
            house: address.house || "",
            area: address.area || "",
            city: address.city || "",
            state: address.state || "",
            landmark: address.landmark || "",
            type: address.type || "Home",
        });

        setFormErrors({});
        setFormOpen(true);
    };

    const closeForm = () => {
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
            [name]: nextValue,
        }));

        if (formErrors[name]) {
            setFormErrors((previous) => ({
                ...previous,
                [name]: "",
            }));
        }
    };

    // ================== ADD / EDIT ADDRESS ==================
    const handleSaveAddress = (event) => {
        event.preventDefault();

        const normalized = Object.fromEntries(
            Object.entries(formData).map(([key, value]) => [
                key,
                typeof value === "string" ? value.trim() : value,
            ])
        );

        const errors = validateAddress(normalized);

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        let nextAddresses;
        let nextSelectedId = selectedId;

        if (editingId !== null) {
            nextAddresses = addresses.map((address) =>
                address.id === editingId
                    ? { ...address, ...normalized }
                    : address
            );
        } else {
            const newAddress = {
                id: createAddressId(),
                ...normalized,
            };

            nextAddresses = [...addresses, newAddress];

            if (!selectedId) {
                nextSelectedId = newAddress.id;
            }
        }

        const saved = saveAddressData({
            addresses: nextAddresses,
            selectedId: nextSelectedId,
        });

        if (!saved) return;

        toast.success(
            editingId !== null
                ? "Address updated successfully."
                : "Address added successfully."
        );

        closeForm();
    };

    // ================== SET DEFAULT ==================
    const handleSetDefault = (addressId) => {
        if (addressId === selectedId) return;

        const saved = saveAddressData({
            addresses,
            selectedId: addressId,
        });

        if (saved) {
            toast.success("Default delivery address updated.");
        }
    };

    // ================== DELETE ADDRESS ==================
    const handleDeleteAddress = () => {
        if (!deleteAddress) return;

        const nextAddresses = addresses.filter(
            (address) => address.id !== deleteAddress.id
        );

        const nextSelectedId =
            selectedId === deleteAddress.id
                ? nextAddresses[0]?.id || null
                : selectedId;

        const saved = saveAddressData({
            addresses: nextAddresses,
            selectedId: nextSelectedId,
        });

        if (!saved) return;

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
                        Add and manage delivery addresses for
                        a faster checkout experience.
                    </p>
                </div>

                <button
                    type="button"
                    className="customer-addresses-add-button"
                    onClick={openAddForm}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Add New Address
                </button>
            </div>

            {/* Address Summary */}
            <div className="customer-addresses-summary">
                <span className="customer-addresses-summary-icon">
                    <i
                        className="fa-solid fa-map-location-dot"
                        aria-hidden="true"
                    />
                </span>

                <div>
                    <strong>
                        {addresses.length} Saved{" "}
                        {addresses.length === 1
                            ? "Address"
                            : "Addresses"}
                    </strong>

                    <p>
                        Choose your preferred delivery location
                        and keep your address details updated.
                    </p>
                </div>

                <span className="customer-addresses-summary-decoration">
                    <i
                        className="fa-solid fa-location-dot"
                        aria-hidden="true"
                    />
                </span>
            </div>

            {/* Saved Address Cards */}
            {addresses.length === 0 ? (
                <div className="customer-addresses-empty">
                    <span className="customer-addresses-empty-icon">
                        <i
                            className="fa-solid fa-map-location-dot"
                            aria-hidden="true"
                        />
                    </span>

                    <h3>No saved addresses yet</h3>

                    <p>
                        Add your first delivery address to make
                        checkout faster and more convenient.
                    </p>

                    <button
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

                                        <strong>
                                            {address.type || "Other"}
                                        </strong>
                                    </div>

                                    {isDefault && (
                                        <span className="customer-address-default-badge">
                                            <i
                                                className="fa-solid fa-circle-check"
                                                aria-hidden="true"
                                            />
                                            Default Address
                                        </span>
                                    )}
                                </div>

                                <div className="customer-address-card-body">
                                    <h3>{address.name}</h3>

                                    <p className="customer-address-card-phone">
                                        <i
                                            className="fa-solid fa-phone"
                                            aria-hidden="true"
                                        />
                                        {address.phone}
                                    </p>

                                    <div className="customer-address-card-location">
                                        <i
                                            className="fa-solid fa-location-dot"
                                            aria-hidden="true"
                                        />

                                        <p>
                                            {address.house}, {address.area}
                                            {address.landmark
                                                ? `, ${address.landmark}`
                                                : ""}

                                            <span>
                                                {address.city}, {address.state}
                                            </span>

                                            <span>
                                                PIN: {address.pincode}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="customer-address-card-footer">
                                    <div className="customer-address-card-tools">
                                        <button
                                            type="button"
                                            className="customer-address-edit"
                                            onClick={() => openEditForm(address)}
                                        >
                                            <i
                                                className="fa-solid fa-pen"
                                                aria-hidden="true"
                                            />
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="customer-address-delete"
                                            onClick={() => setDeleteAddress(address)}
                                        >
                                            <i
                                                className="fa-solid fa-trash-can"
                                                aria-hidden="true"
                                            />
                                            Delete
                                        </button>
                                    </div>

                                    {!isDefault && (
                                        <button
                                            type="button"
                                            className="customer-address-set-default"
                                            onClick={() => handleSetDefault(address.id)}
                                        >
                                            Set as Default
                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Important Information */}
            <div className="customer-addresses-info">
                <i
                    className="fa-solid fa-circle-info"
                    aria-hidden="true"
                />

                <p>
                    Your default address is preselected at checkout.
                    Updating a saved address will not change
                    delivery details on an existing order.
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
                                    editingId !== null
                                        ? "fa-pen-to-square"
                                        : "fa-location-dot"
                                }`}
                                aria-hidden="true"
                            />
                        </span>

                        <span>
                            <strong>
                                {editingId !== null
                                    ? "Edit Address"
                                    : "Add New Address"}
                            </strong>

                            <small>
                                Fill in your delivery information below.
                            </small>
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
                            <TextField
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.name)}
                                helperText={formErrors.name}
                                autoComplete="name"
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: { maxLength: 80 },
                                }}
                            />

                            <TextField
                                label="Mobile Number"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.phone)}
                                helperText={formErrors.phone}
                                autoComplete="tel"
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: {
                                        inputMode: "numeric",
                                    },
                                }}
                            />

                            <TextField
                                label="PIN Code"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.pincode)}
                                helperText={formErrors.pincode}
                                autoComplete="postal-code"
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: {
                                        inputMode: "numeric",
                                    },
                                }}
                            />

                            <TextField
                                select
                                label="Address Type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.type)}
                                helperText={formErrors.type}
                                required
                                fullWidth
                                size="small"
                            >
                                {addressTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="House / Flat / Building"
                                name="house"
                                value={formData.house}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.house)}
                                helperText={formErrors.house}
                                autoComplete="address-line1"
                                required
                                fullWidth
                                size="small"
                                className="customer-address-form-full"
                                slotProps={{
                                    htmlInput: { maxLength: 150 },
                                }}
                            />

                            <TextField
                                label="Street / Area / Locality"
                                name="area"
                                value={formData.area}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.area)}
                                helperText={formErrors.area}
                                autoComplete="address-line2"
                                required
                                fullWidth
                                size="small"
                                className="customer-address-form-full"
                                slotProps={{
                                    htmlInput: { maxLength: 150 },
                                }}
                            />

                            <TextField
                                label="City"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.city)}
                                helperText={formErrors.city}
                                autoComplete="address-level2"
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: { maxLength: 80 },
                                }}
                            />

                            <TextField
                                label="State"
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.state)}
                                helperText={formErrors.state}
                                autoComplete="address-level1"
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: { maxLength: 80 },
                                }}
                            />

                            <TextField
                                label="Landmark (Optional)"
                                name="landmark"
                                value={formData.landmark}
                                onChange={handleInputChange}
                                fullWidth
                                size="small"
                                className="customer-address-form-full"
                                slotProps={{
                                    htmlInput: { maxLength: 150 },
                                }}
                            />
                        </div>
                    </form>
                </DialogContent>

                <DialogActions className="customer-address-dialog-actions">
                    <button
                        type="button"
                        className="customer-address-dialog-cancel"
                        onClick={closeForm}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="customer-address-form"
                        className="customer-address-dialog-save"
                    >
                        <i className="fa-solid fa-check" aria-hidden="true" />

                        {editingId !== null
                            ? "Update Address"
                            : "Save Address"}
                    </button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog
                open={Boolean(deleteAddress)}
                onClose={() => setDeleteAddress(null)}
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
                        Are you sure you want to delete this saved
                        address? This action cannot be undone.
                    </p>
                </DialogContent>

                <DialogActions className="customer-address-dialog-actions">
                    <button
                        type="button"
                        className="customer-address-dialog-cancel"
                        onClick={() => setDeleteAddress(null)}
                    >
                        Keep Address
                    </button>

                    <button
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
