const moneyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

export default function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === "") {
        return "—";
    }

    const value = Number(amount);

    return Number.isFinite(value) ? moneyFormatter.format(value) : "—";
}
