import { TextField } from "@mui/material";

const addressFields = [
    { name: "name", label: "Full Name", autoComplete: "name", maxLength: 80 },
    { name: "phone", label: "Mobile Number", autoComplete: "tel", maxLength: 10, numeric: true },
    { name: "pincode", label: "PIN Code", autoComplete: "postal-code", maxLength: 6, numeric: true },
    { name: "house", label: "House / Flat / Building", autoComplete: "address-line1", full: true },
    { name: "area", label: "Street / Area / Locality", autoComplete: "address-line2", full: true },
    { name: "city", label: "City", autoComplete: "address-level2" },
    { name: "state", label: "State", autoComplete: "address-level1" },
    { name: "landmark", label: "Landmark (Optional)", full: true }
];

export function validateAddress(address = {}) {
    const value = (key) => String(address[key] ?? "").trim();

    return {
        name: value("name").length >= 2 ? "" : "Enter a valid full name.",
        phone: /^[6-9]\d{9}$/.test(value("phone")) ? "" : "Enter a valid 10-digit mobile number.",
        pincode: /^\d{6}$/.test(value("pincode")) ? "" : "Enter a valid 6-digit PIN code.",
        house: value("house") ? "" : "House or building details are required.",
        area: value("area") ? "" : "Street or locality is required.",
        city: value("city") ? "" : "City is required.",
        state: value("state") ? "" : "State is required."
    };
}

function AddressForm({ address, onChange, errors = {}, submitted = false, disabled = false }) {
    const handleChange = (event) => {
        const { name, value } = event.target;

        onChange({
            ...address,
            [name]: ["phone", "pincode"].includes(name) ? value.replace(/\D/g, "") : value
        });
    };

    return (
        <div className="checkout-address-form">
            {addressFields.map((field) => {
                const error = submitted ? errors[field.name] : "";

                return (
                    <div
                        key={field.name}
                        className={`checkout-form-field ${field.full ? "checkout-form-field-full" : ""}`}
                    >
                        <TextField
                            id={`address-${field.name}`}
                            name={field.name}
                            label={field.label}
                            type={field.name === "phone" ? "tel" : "text"}
                            variant="outlined"
                            size="small"
                            fullWidth
                            required={field.name !== "landmark"}
                            value={address[field.name] ?? ""}
                            onChange={handleChange}
                            autoComplete={field.autoComplete}
                            disabled={disabled}
                            error={Boolean(error)}
                            helperText={error || undefined}
                            slotProps={{
                                htmlInput: {
                                    maxLength: field.maxLength || 150,
                                    inputMode: field.numeric ? "numeric" : "text"
                                }
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

export default AddressForm;
