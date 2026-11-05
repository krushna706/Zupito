import { useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    TextField
} from "@mui/material";

import AddressForm, { validateAddress } from "./AddressForm";

const emptyAddress = {
    name: "",
    phone: "",
    pincode: "",
    house: "",
    area: "",
    city: "",
    state: "",
    landmark: "",
    type: "Home"
};

const getAddressId = (address) => String(address.id ?? address._id);

const formatAddress = (address) =>
    [address.house, address.area, address.landmark, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ");

function AddressSelector({
    open,
    addresses = [],
    selectedAddressId,
    initialMode = "list",
    editAddressId = null,
    initialDeleteId = null,
    onClose,
    onSelect,
    onSave,
    onDelete
}) {
    const initialEditAddress = addresses.find((item) => getAddressId(item) === String(editAddressId));

    const [mode, setMode] = useState(initialMode === "add" || initialMode === "edit" ? "form" : "list");

    const [editingId, setEditingId] = useState(initialMode === "edit" ? editAddressId : null);

    const [draft, setDraft] = useState(() => ({
        ...emptyAddress,
        ...(initialMode === "edit" ? initialEditAddress : {})
    }));

    const [submitted, setSubmitted] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(initialDeleteId);

    const errors = validateAddress(draft);

    const handleAddNew = () => {
        setEditingId(null);
        setDraft({ ...emptyAddress });
        setSubmitted(false);
        setPendingDeleteId(null);
        setMode("form");
    };

    const handleEdit = (address) => {
        setEditingId(getAddressId(address));
        setDraft({ ...emptyAddress, ...address });
        setSubmitted(false);
        setPendingDeleteId(null);
        setMode("form");
    };

    const handleSave = () => {
        setSubmitted(true);

        if (Object.values(errors).some(Boolean)) return;

        onSave({
            ...draft,
            id: editingId || undefined
        });

        onClose();
    };

    const handleSelect = (id) => {
        onSelect(id);
        onClose();
    };

    const handleDelete = (id) => {
        onDelete(id);
        setPendingDeleteId(null);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            className="checkout-address-dialog"
            aria-labelledby="address-dialog-title"
        >
            <DialogTitle className="checkout-address-dialog-title">
                <div>
                    <h2 id="address-dialog-title">
                        {mode === "form"
                            ? editingId
                                ? "Edit Address"
                                : "Add New Address"
                            : "Choose Delivery Address"}
                    </h2>
                    <p>
                        {mode === "form"
                            ? "Enter your delivery details."
                            : "Select an address or manage your saved addresses."}
                    </p>
                </div>

                <IconButton type="button" aria-label="Close" onClick={onClose} size="small">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers className="checkout-address-dialog-content">
                {mode === "list" ? (
                    <div className="checkout-address-list">
                        {addresses.length === 0 ? (
                            <div className="checkout-address-empty">
                                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                <p>No saved addresses available.</p>
                                <span>Add an address to continue.</span>
                            </div>
                        ) : (
                            addresses.map((address) => {
                                const id = getAddressId(address);
                                const selected = String(selectedAddressId) === id;

                                return (
                                    <div
                                        key={id}
                                        className={`checkout-address-option ${selected ? "is-selected" : ""}`}
                                    >
                                        <label className="checkout-address-option-main">
                                            <input
                                                type="radio"
                                                name="selectedDeliveryAddress"
                                                value={id}
                                                checked={selected}
                                                onChange={() => handleSelect(id)}
                                            />

                                            <span className="checkout-address-option-details">
                                                <span className="checkout-address-option-top">
                                                    <strong>{address.type || "Address"}</strong>

                                                    {selected && (
                                                        <span className="checkout-address-selected-badge">
                                                            Selected
                                                        </span>
                                                    )}
                                                </span>

                                                <strong className="checkout-address-person">
                                                    {address.name}
                                                </strong>

                                                <span className="checkout-address-location">
                                                    {formatAddress(address)}
                                                </span>

                                                <span className="checkout-address-phone">
                                                    Mobile: {address.phone}
                                                </span>
                                            </span>
                                        </label>

                                        <div className="checkout-address-option-actions">
                                            <button type="button" onClick={() => handleEdit(address)}>
                                                <i
                                                    className="fa-regular fa-pen-to-square"
                                                    aria-hidden="true"
                                                />
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="is-danger"
                                                onClick={() => setPendingDeleteId(id)}
                                            >
                                                <i className="fa-regular fa-trash-can" aria-hidden="true" />
                                                Delete
                                            </button>
                                        </div>

                                        {String(pendingDeleteId) === id && (
                                            <div className="checkout-address-delete-confirm">
                                                <span>Delete this address?</span>

                                                <button type="button" onClick={() => handleDelete(id)}>
                                                    Yes, Delete
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setPendingDeleteId(null)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="checkout-address-editor">
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Address Type"
                            value={draft.type || "Home"}
                            onChange={(event) => {
                                setDraft((current) => ({
                                    ...current,
                                    type: event.target.value
                                }));
                            }}
                            className="checkout-address-type-input"
                        >
                            <MenuItem value="Home">Home</MenuItem>
                            <MenuItem value="Work">Work</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>

                        <AddressForm
                            address={draft}
                            onChange={setDraft}
                            errors={errors}
                            submitted={submitted}
                        />
                    </div>
                )}
            </DialogContent>

            <DialogActions className="checkout-address-dialog-actions">
                {mode === "list" ? (
                    <>
                        <Button type="button" onClick={onClose} className="checkout-dialog-secondary">
                            Close
                        </Button>

                        <Button
                            type="button"
                            variant="contained"
                            onClick={handleAddNew}
                            className="checkout-dialog-primary"
                            startIcon={<i className="fa-solid fa-plus" aria-hidden="true" />}
                        >
                            Add New Address
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            onClick={() => {
                                if (addresses.length > 0) {
                                    setMode("list");
                                    setSubmitted(false);
                                } else {
                                    onClose();
                                }
                            }}
                            className="checkout-dialog-secondary"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="contained"
                            onClick={handleSave}
                            className="checkout-dialog-primary"
                        >
                            {editingId ? "Update Address" : "Save Address"}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default AddressSelector;
