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