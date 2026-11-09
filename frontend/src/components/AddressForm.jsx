import { TextField } from "@mui/material";

export { validateAddress } from "../services/userService";

const addressFields = [
    {
        name: "name",
        label: "Full Name",
        autoComplete: "name",
        maxLength: 80
    },
    {
        name: "phone",
        label: "Mobile Number",
        autoComplete: "tel",
        maxLength: 10,
        numeric: true
    },
    {
        name: "pincode",
        label: "PIN Code",
        autoComplete: "postal-code",
        maxLength: 6,
        numeric: true
    },
    {
        name: "house",
        label: "House / Flat / Building",
        autoComplete: "address-line1",
        full: true
    },
    {
        name: "area",
        label: "Street / Area / Locality",
        autoComplete: "address-line2",
        full: true
    },
    {
        name: "city",
        label: "City",
        autoComplete: "address-level2",
        maxLength: 80
    },
    {
        name: "state",
        label: "State",
        autoComplete: "address-level1",
        maxLength: 80
    },
    {
        name: "landmark",
        label: "Landmark (Optional)",
        full: true
    }
];

function AddressForm({
    address,
    onChange,
    errors = {},
    submitted = false,
    disabled = false
}) {
    const handleChange = (event) => {
        const { name, value } = event.target;

        onChange({
            ...address,
            [name]: ["phone", "pincode"].includes(name)
                ? value.replace(/\D/g, "")
                : value
        });
    };

    return (
        <div className="checkout-address-form">
            {addressFields.map((field) => {
                const error = submitted ? errors[field.name] : "";

                return (
                    <div
                        key={field.name}
                        className={`checkout-form-field ${
                            field.full ? "checkout-form-field-full" : ""
                        }`}
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