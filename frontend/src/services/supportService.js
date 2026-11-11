import api from "./api";
export const getComplaints = async () => (await api.get("/complaints")).data.complaints;
export const submitComplaint = async (values, image) => {
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, value));
    if (image) form.append("attachment", image);
    return (await api.post("/complaints", form)).data.complaint;
};
export const sendEnquiry = async (values) => (await api.post("/complaints/enquiries", values)).data;
