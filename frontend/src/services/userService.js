import api from "./api";

export async function updateProfile({ name, pictureFile }) {
    const form = new FormData();

    form.append("name", name);

    if (pictureFile) {
        form.append("avatar", pictureFile);
    }

    const response = await api.patch("/users/profile", form, {
        timeout: 90000,
    });

    return response.data.user;
}

export const emptyAddress = {
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

export const addressTypes = ["Home", "Work", "Other"];

export function normalizeAddress(input) {
    return Object.fromEntries(
        Object.keys(emptyAddress).map((key) => [
            key,
            String(input[key] ?? emptyAddress[key]).trim()
        ])
    );
}

export function validateAddress(input = {}) {
    const address = normalizeAddress(input);
    const errors = {};

    const limits = {
        name: 80,
        house: 150,
        area: 150,
        city: 80,
        state: 80
    };

    for (const [key, maximum] of Object.entries(limits)) {
        if (
            address[key].length < 2 ||
            address[key].length > maximum
        ) {
            errors[key] = `Enter 2–${maximum} characters.`;
        }
    }

    if (!/^[6-9]\d{9}$/.test(address.phone)) {
        errors.phone = "Enter a valid 10-digit mobile number.";
    }

    if (!/^[1-9]\d{5}$/.test(address.pincode)) {
        errors.pincode = "Enter a valid 6-digit PIN code.";
    }

    if (address.landmark.length > 150) {
        errors.landmark = "Use up to 150 characters.";
    }

    if (!addressTypes.includes(address.type)) {
        errors.type = "Select an address type.";
    }

    return errors;
}

export async function getAddresses() {
    const { data } = await api.get("/users/addresses");
    return data.addressBook;
}

export async function saveAddress(input, version, select = false) {
    const body = {
        ...normalizeAddress(input),
        version,
        select
    };

    const { data } = input.id
        ? await api.patch(
              `/users/addresses/${encodeURIComponent(input.id)}`,
              body
          )
        : await api.post("/users/addresses", body);

    return data.addressBook;
}

export async function removeAddress(id, version) {
    const { data } = await api.delete(
        `/users/addresses/${encodeURIComponent(id)}`,
        { data: { version } }
    );

    return data.addressBook;
}

export async function setDefaultAddress(id, version) {
    const { data } = await api.patch(
        `/users/addresses/${encodeURIComponent(id)}/default`,
        { version }
    );

    return data.addressBook;
}