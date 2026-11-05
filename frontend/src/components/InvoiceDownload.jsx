import { getOrderId, getOrderTotal, getProductName } from "../utils/orderStatus";
import { useState } from "react";
import { toast } from "react-toastify";
import { appConfig } from "../config/appConfig";

const NAVY = [7, 27, 69];
const MUTED = [101, 116, 137];

function safeFileName(value) {
    return String(value)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 80);
}

function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
        return "Not available";
    }

    const amount = Number(value);

    return Number.isFinite(amount)
        ? `Rs. ${amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
          })}`
        : "Not available";
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata"
    }).format(date);
}

function loadLogo(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);

        const image = new Image();
        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext("2d").drawImage(image, 0, 0);

                resolve({
                    data: canvas.toDataURL("image/png"),
                    width: image.naturalWidth,
                    height: image.naturalHeight
                });
            } catch {
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

async function createDemoSummary(jsPDF, order, address) {
    const pdf = new jsPDF({
        unit: "mm",
        format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 19;
    const contentWidth = pageWidth - margin * 2;

    let y = 23;

    // PDF built-in fonts use limited character sets.
    const text = (value) => String(value ?? "");

    const pageFooter = () => {
        pdf.setDrawColor(226, 231, 239);

        pdf.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...MUTED);
        pdf.setFontSize(8);

        pdf.text("Demo order summary - not a tax invoice or proof of purchase.", margin, pageHeight - 17);

        pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 17, { align: "right" });
    };

    const newPageIfNeeded = (height = 12) => {
        if (y + height > pageHeight - 31) {
            pageFooter();
            pdf.addPage();
            y = 23;
        }
    };

    const infoRow = (label, value) => {
        newPageIfNeeded(11);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);
        pdf.text(label, margin, y);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...NAVY);

        const lines = pdf.splitTextToSize(text(value), contentWidth - 48);

        pdf.text(lines, margin + 48, y);

        y += Math.max(9, lines.length * 5 + 3);
    };

    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, pageWidth, 14, "F");

    // Center the existing Zupito logo without changing the original layout.
    const logo = await loadLogo(appConfig.logo);

    if (logo) {
        const maxWidth = 42;
        const maxHeight = 15;
        const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height);
        const width = logo.width * ratio;
        const height = logo.height * ratio;

        pdf.addImage(logo.data, "PNG", (pageWidth - width) / 2, 18, width, height);
    } else {
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...NAVY);
        pdf.setFontSize(22);
        pdf.text("ZUPITO", pageWidth / 2, 29, { align: "center" });
    }

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(11);
    pdf.text("DEMO ORDER SUMMARY", pageWidth / 2, 39, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text("Sample document for portfolio preview only", pageWidth / 2, 46, { align: "center" });

    y = 57;

    infoRow("Order ID", getOrderId(order));

    infoRow("Order Date", formatDate(order.createdAt));

    infoRow("Order Status", text(order.orderStatus || order.status || "Unavailable").replace(/_/g, " "));

    infoRow("Payment", text(order.payment?.status || order.paymentStatus || "Demo Preview"));

    if (address) {
        newPageIfNeeded(28);

        y += 5;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...NAVY);

        pdf.text("DELIVERY ADDRESS", margin, y);

        y += 7;

        const addressLines = [
            address.name,
            [address.house, address.area, address.landmark].filter(Boolean).join(", "),
            [address.city, address.state, address.pincode].filter(Boolean).join(", ")
        ].filter(Boolean);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);

        addressLines.forEach((line) => {
            const wrapped = pdf.splitTextToSize(text(line), contentWidth);

            newPageIfNeeded(wrapped.length * 5 + 2);

            pdf.text(wrapped, margin, y);

            y += wrapped.length * 5 + 2;
        });
    }

    newPageIfNeeded(28);

    y += 7;

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(11);

    pdf.text("ORDER ITEMS", margin, y);

    y += 9;

    const qtyX = pageWidth - margin - 65;
    const unitX = pageWidth - margin - 32;
    const amountX = pageWidth - margin;

    pdf.setFillColor(244, 247, 251);

    pdf.rect(margin, y - 5, contentWidth, 10, "F");

    pdf.setFontSize(8);

    pdf.text("Product", margin + 3, y + 1);

    pdf.text("Qty", qtyX, y + 1, { align: "right" });

    pdf.text("Unit", unitX, y + 1, { align: "right" });

    pdf.text("Amount", amountX - 2, y + 1, { align: "right" });

    y += 12;

    const items = Array.isArray(order.items) ? order.items : [];

    if (!items.length) {
        infoRow("Items", "Information unavailable");
    }

    items.forEach((item) => {
        const name = getProductName(item);

        const lines = pdf.splitTextToSize(text(name), contentWidth - 79);

        const rowHeight = Math.max(12, lines.length * 5 + 6);

        const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

        const unitPrice = item.unitPrice ?? item.price ?? item.productSnapshot?.price;

        const lineTotal =
            item.lineTotal ??
            item.totalPrice ??
            (unitPrice !== null &&
            unitPrice !== undefined &&
            unitPrice !== "" &&
            Number.isFinite(Number(unitPrice))
                ? Number(unitPrice) * quantity
                : null);

        newPageIfNeeded(rowHeight);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...NAVY);

        pdf.text(lines, margin + 3, y);

        pdf.text(String(quantity), qtyX, y, { align: "right" });

        pdf.text(unitPrice == null ? "-" : formatMoney(unitPrice), unitX, y, { align: "right" });

        pdf.text(lineTotal == null ? "-" : formatMoney(lineTotal), amountX - 2, y, { align: "right" });

        y += rowHeight;

        pdf.setDrawColor(231, 235, 242);

        pdf.line(margin, y - 4, pageWidth - margin, y - 4);
    });

    const pricing = order.pricing || {};

    const charges = [
        ["Subtotal", pricing.subtotal ?? order.subtotal],
        ["Delivery Fee", pricing.shippingFee ?? order.shippingFee],
        ["Discount", pricing.discount ?? order.discount]
    ].filter(([, value]) => value != null);

    if (charges.length) {
        y += 5;

        charges.forEach(([label, value]) => {
            newPageIfNeeded(9);

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...MUTED);
            pdf.setFontSize(8);

            pdf.text(label, margin, y);

            pdf.setTextColor(...NAVY);

            pdf.text(formatMoney(value), pageWidth - margin, y, { align: "right" });

            y += 9;
        });
    }

    newPageIfNeeded(25);

    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);

    pdf.text("ORDER TOTAL", margin, y);

    pdf.text(formatMoney(getOrderTotal(order)), pageWidth - margin, y, { align: "right" });

    y += 13;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...MUTED);
    pdf.setFontSize(8.5);

    const note = pdf.splitTextToSize(
        "This is a sample order summary only. Tax amounts, " +
            "invoice numbers and seller tax information are not " +
            "generated in demo mode. Official invoices will use " +
            "verified backend records.",
        contentWidth
    );

    newPageIfNeeded(note.length * 5 + 5);

    pdf.text(note, margin, y);

    pageFooter();

    return pdf;
}

function InvoiceDownload({ order, address = null, isDemo = false, onDownload }) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        const orderId = getOrderId(order);

        if (!orderId || downloading) return;

        // Real invoices are generated by the backend.
        if (!isDemo && typeof onDownload !== "function") {
            toast.info("Invoice download will be available after backend integration.");

            return;
        }

        try {
            setDownloading(true);

            if (isDemo) {
                const { jsPDF } = await import("jspdf");

                const pdf = await createDemoSummary(jsPDF, order, address);

                pdf.save(`Zupito_${safeFileName(orderId)}_Demo_Summary.pdf`);

                return;
            }

            // Backend verifies order ownership and returns a PDF Blob.
            const result = await onDownload(orderId);

            const blob = result instanceof Blob ? result : result?.blob;

            if (!(blob instanceof Blob) || blob.type !== "application/pdf") {
                throw new Error("A valid invoice PDF was not returned.");
            }

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download = `Zupito_${safeFileName(orderId)}_Invoice.pdf`;

            document.body.appendChild(link);

            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 3000);
        } catch (error) {
            toast.error(error?.message || "Unable to download invoice. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <button
            type="button"
            className="customer-detail-primary-button w-100 mt-3"
            onClick={handleDownload}
            disabled={downloading || !getOrderId(order)}
        >
            <i
                className={`fa-solid ${downloading ? "fa-spinner fa-spin" : "fa-file-arrow-down"} me-2`}
                aria-hidden="true"
            />

            {downloading ? "Preparing PDF..." : isDemo ? "Download Sample Summary" : "Download Invoice"}
        </button>
    );
}

export default InvoiceDownload;
