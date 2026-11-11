import { useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

function InvoiceDownload({ order, onDownload }) {
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const id = order?.orderId || order?._id || order?.id;

    const download = async () => {
        if (!id || lock.current) return;
        lock.current = true;
        setBusy(true);
        try {
            const result = onDownload
                ? await onDownload(id)
                : (
                      await api.get(`/orders/${encodeURIComponent(id)}/invoice`, {
                          responseType: "blob",
                      })
                  ).data;
            const blob = result instanceof Blob ? result : result?.blob;
            if (!(blob instanceof Blob) || !blob.type.includes("application/pdf")) {
                throw new Error("Unable to prepare your order receipt.");
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Zupito_${id}_Receipt.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        } catch (error) {
            toast.error(error.message || "Unable to download receipt.");
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="customer-detail-primary-button w-100 mt-3"
            onClick={download}
            disabled={busy || !id}
        >
            <i
                className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-file-arrow-down"} me-2`}
                aria-hidden="true"
            />
            {busy ? "Preparing PDF..." : "Download Receipt"}
        </button>
    );
}

export default InvoiceDownload;
