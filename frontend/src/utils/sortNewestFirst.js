export function sortNewestFirst(records, dateKey = "createdAt", idKey = "id") {
    return [...records].sort((a, b) => {
        const dateA = Date.parse(a[dateKey] || "") || 0;
        const dateB = Date.parse(b[dateKey] || "") || 0;

        if (dateA !== dateB) {
            return dateB - dateA;
        }

        return String(b[idKey] || "").localeCompare(String(a[idKey] || ""), undefined, {
            numeric: true,
        });
    });
}
