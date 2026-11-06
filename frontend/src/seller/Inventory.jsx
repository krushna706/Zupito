
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import {
    applyInventoryMovements,
    ensureStockHistory,
    formatMoney,
    getStockMovements,
    inventoryRows,
    sellerKey,
} from "../services/sellerService";

// ================== CONFIGURATION ==================
const MAX_STOCK = 999999;
const MAX_CSV_ROWS = 300;
const MAX_CSV_BYTES = 256 * 1024;

const stockFilters = [
    "All",
    "In Stock",
    "Low Stock",
    "Out of Stock",
    "Needs Attention",
];

const movementTypes = [
    "All",
    "Opening",
    "Restock",
    "Adjustment",
    "Damage/Loss",
    "Sale",
    "Return",
    "Replacement Dispatch",
];

function isValidQuantity(value) {
    return /^(0|[1-9]\d*)$/.test(String(value)) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) <= MAX_STOCK;
}

function thresholdKey(user) {
    return `zupito_seller_stock_alert_${sellerKey(user)}`;
}

function readThreshold(user) {
    try {
        const value = Number(localStorage.getItem(thresholdKey(user)));

        return Number.isInteger(value) &&
            value >= 1 &&
            value <= 100
            ? String(value)
            : "5";
    } catch {
        return "5";
    }
}

function stockState(row, limit) {
    if (row.available <= 0) return "Out of Stock";
    if (row.available <= limit) return "Low Stock";

    return "In Stock";
}

// ================== STATUS BADGE ==================
function InventoryBadge({ value }) {
    const success = [
        "In Stock",
        "Approved",
        "Restock",
        "Opening",
        "Return",
        "Ready",
    ];

    const warning = [
        "Low Stock",
        "Pending",
        "Adjustment",
    ];

    const danger = [
        "Out of Stock",
        "Rejected",
        "Damage/Loss",
        "Sale",
        "Invalid",
    ];

    let color = "neutral";

    if (success.includes(value)) {
        color = "success";
    } else if (warning.includes(value)) {
        color = "warning";
    } else if (danger.includes(value)) {
        color = "danger";
    }

    return (
        <span className={`si-badge si-badge-${color}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {value}
        </span>
    );
}

// ================== CSV HELPERS ==================
function parseCSV(text) {
    const records = [];
    const source = text.replace(/^\uFEFF/, "");

    let cells = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];

        if (char === '"') {
            if (quoted && source[index + 1] === '"') {
                cell += '"';
                index++;
            } else if (quoted || !cell.trim()) {
                quoted = !quoted;
            } else {
                throw new Error("CSV contains invalid quotation marks.");
            }
        } else if (char === "," && !quoted) {
            cells.push(cell.trim());
            cell = "";
        } else if (
            (char === "\r" || char === "\n") &&
            !quoted
        ) {
            cells.push(cell.trim());

            if (cells.some(Boolean)) {
                records.push(cells);
            }

            cells = [];
            cell = "";

            if (char === "\r" && source[index + 1] === "\n") {
                index++;
            }
        } else {
            cell += char;
        }
    }

    if (quoted) {
        throw new Error("CSV contains an unclosed quote.");
    }

    cells.push(cell.trim());

    if (cells.some(Boolean)) {
        records.push(cells);
    }

    return records;
}

function fileFingerprint(text, mode, owner) {
    const input = `${owner}|${mode}|${text}`;
    let hash = 2166136261;

    for (let index = 0; index < input.length; index++) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return `CSV-${(hash >>> 0).toString(36).toUpperCase()}`;
}

function inspectCSV(text, mode, inventory, history, user) {
    const rows = parseCSV(text);

    if (rows.length < 2) {
        throw new Error("CSV needs a header and at least one data row.");
    }

    if (rows.length > MAX_CSV_ROWS + 1) {
        throw new Error(`Maximum ${MAX_CSV_ROWS} data rows allowed.`);
    }

    const headers = rows[0].map((value) => value.toLowerCase());

    if (
        headers.length !== 2 ||
        headers[0] !== "sku" ||
        headers[1] !== "stock"
    ) {
        throw new Error("Use exactly two columns: sku,stock.");
    }

    const reference = fileFingerprint(
        text,
        mode,
        sellerKey(user)
    );

    const productsBySku = new Map();

    inventory.forEach((item) => {
        const existing = productsBySku.get(item.sku) || [];

        productsBySku.set(
            item.sku,
            [...existing, item]
        );
    });

    const seen = new Set();

    const results = rows.slice(1).map((cells, index) => {
        const sku = String(cells[0] || "").trim().toUpperCase();
        const stock = String(cells[1] ?? "").trim();

        const matched = productsBySku.get(sku) || [];
        const item = matched[0];
        const eventKey = `${reference}:${sku}`;

        const after = item
            ? mode === "add"
                ? item.onHand + Number(stock)
                : Number(stock)
            : NaN;

        let error = "";

        if (cells.length !== 2) {
            error = "Expected exactly two values.";
        } else if (!sku) {
            error = "SKU is required.";
        } else if (seen.has(sku)) {
            error = "Duplicate SKU in this file.";
        } else if (matched.length !== 1) {
            error = matched.length
                ? "SKU is ambiguous."
                : "SKU does not belong to your inventory.";
        } else if (
            !isValidQuantity(stock) ||
            (mode === "add" && Number(stock) === 0)
        ) {
            error = "Invalid quantity.";
        } else if (
            after > MAX_STOCK ||
            after < item.reserved
        ) {
            error = "Quantity conflicts with stock limits or reservations.";
        } else if (history.some((entry) =>
            entry.eventKey === eventKey
        )) {
            error = "This CSV update was already applied.";
        }

        seen.add(sku);

        const status = error
            ? "Invalid"
            : after === item.onHand
                ? "Unchanged"
                : "Ready";

        return {
            row: index + 2,
            sku,
            stock,
            after,
            item,
            status,
            error,
            eventKey,
        };
    });

    return {
        reference,
        results,
    };
}

function downloadCSV(filename, rows) {
    const escapeValue = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = rows
        .map((row) => row.map(escapeValue).join(","))
        .join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

// ================== INVENTORY PAGE ==================
function Inventory({ user }) {
    const [inventory, setInventory] = useState(() => inventoryRows(user));
    const [history, setHistory] = useState(() => getStockMovements(user));

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [threshold, setThreshold] = useState(() => readThreshold(user));
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [editRow, setEditRow] = useState(null);
    const [mode, setMode] = useState("add");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [reference, setReference] = useState("");

    const [showImport, setShowImport] = useState(false);
    const [csvMode, setCsvMode] = useState("set");
    const [csvPreview, setCsvPreview] = useState(null);
    const [csvFile, setCsvFile] = useState("");

    const [historyQuery, setHistoryQuery] = useState("");
    const [historyType, setHistoryType] = useState("All");
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRows, setHistoryRows] = useState(10);

    // ================== DATA HANDLING ==================
    const refresh = () => {
        try {
            ensureStockHistory(user);
        } catch {
            toast.error("Unable to initialize inventory history.");
        }

        setInventory(inventoryRows(user));
        setHistory(getStockMovements(user));
    };

    useEffect(() => {
        const sync = () => {
            try {
                ensureStockHistory(user);
            } catch {
                // Continue showing existing inventory data.
            }

            setInventory(inventoryRows(user));
            setHistory(getStockMovements(user));
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email]);

    // ================== INVENTORY SUMMARY ==================
    const limit = Number(threshold) || 5;

    const onHand = inventory.reduce(
        (total, item) => total + item.onHand,
        0
    );

    const reserved = inventory.reduce(
        (total, item) => total + item.reserved,
        0
    );

    const received = history
        .filter((item) => ["Opening", "Restock"].includes(item.type))
        .reduce(
            (total, item) => total + Math.max(0, item.change),
            0
        );

    const sold = history
        .filter((item) => item.type === "Sale")
        .reduce(
            (total, item) => total + Math.abs(item.change),
            0
        );

    const low = inventory.filter((item) =>
        stockState(item, limit) === "Low Stock"
    ).length;

    const out = inventory.filter((item) =>
        stockState(item, limit) === "Out of Stock"
    ).length;

    const stats = [
        {
            label: "On-Hand Stock",
            value: onHand,
            note: `${inventory.length} SKUs · ${reserved} reserved`,
            icon: "fa-boxes-stacked",
            color: "blue",
        },
        {
            label: "Total Received",
            value: received,
            note: "Opening + restock units",
            icon: "fa-arrow-down",
            color: "green",
        },
        {
            label: "Total Sold",
            value: sold,
            note: "Order-linked sales only",
            icon: "fa-bag-shopping",
            color: "orange",
        },
        {
            label: "Needs Attention",
            value: low + out,
            note: `${low} low · ${out} out of stock`,
            icon: "fa-triangle-exclamation",
            color: "red",
        },
    ];

    // ================== FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return inventory.filter((item) => {
            const matchesSearch = [
                item.name,
                item.sku,
                item.variant,
                item.productCode,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            const matchesFilter = filter === "All" ||
                stockState(item, limit) === filter ||
                (
                    filter === "Needs Attention" &&
                    item.available <= limit
                );

            return matchesSearch && matchesFilter;
        });
    }, [inventory, search, filter, limit]);

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const filteredHistory = useMemo(() => {
        const query = historyQuery.trim().toLowerCase();

        return history.filter((item) => {
            const matchesType = historyType === "All" ||
                item.type === historyType;

            const matchesSearch = [
                item.sku,
                item.productName,
                item.reference,
                item.reason,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            return matchesType && matchesSearch;
        });
    }, [history, historyQuery, historyType]);

    const visibleHistory = filteredHistory.slice(
        historyPage * historyRows,
        (historyPage + 1) * historyRows
    );

    // ================== STOCK ADJUSTMENT ==================
    const openAdjustment = (item) => {
        setEditRow(item);
        setMode("add");
        setQuantity("");
        setReason("");
        setReference("");
    };

    const adjustedQuantity = editRow
        ? mode === "add"
            ? editRow.onHand + Number(quantity || 0)
            : mode === "remove"
                ? editRow.onHand - Number(quantity || 0)
                : Number(quantity || 0)
        : 0;

    const invalidAdjustment =
        !isValidQuantity(quantity) ||
        (mode !== "set" && Number(quantity) === 0) ||
        adjustedQuantity < (editRow?.reserved || 0) ||
        adjustedQuantity > MAX_STOCK ||
        (mode !== "add" && !reason.trim());

    const saveAdjustment = () => {
        if (!editRow || invalidAdjustment) return;

        const update = {
            productId: editRow.productId,
            variantId: editRow.variantId,
            sku: editRow.sku,
            mode,
            quantity,
            reason: mode === "add"
                ? "Supplier restock"
                : mode === "remove"
                    ? "Damaged or lost stock"
                    : reason.trim(),
            note: reason.trim(),
            reference: reference.trim(),
        };

        try {
            const result = applyInventoryMovements(user, [update]);

            if (result.errors.length) {
                toast.error(result.errors[0]);
                return;
            }

            if (result.updated) {
                toast.success("Stock updated and movement recorded.");
            } else {
                toast.info("Quantity is unchanged.");
            }

            setEditRow(null);
            refresh();
        } catch {
            toast.error("Stock or history could not be saved.");
        }
    };

    // ================== ALERT SETTINGS ==================
    const saveThreshold = () => {
        const value = Math.min(
            100,
            Math.max(1, Number(threshold) || 5)
        );

        setThreshold(String(value));

        try {
            localStorage.setItem(
                thresholdKey(user),
                String(value)
            );
        } catch {
            toast.error("Unable to save alert threshold.");
        }
    };

    // ================== CSV IMPORT ==================
    const handleCSV = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (
            !/\.csv$/i.test(file.name) ||
            file.size > MAX_CSV_BYTES
        ) {
            toast.error("Choose a CSV file up to 256 KB.");
            return;
        }

        try {
            ensureStockHistory(user);

            const result = inspectCSV(
                await file.text(),
                csvMode,
                inventoryRows(user),
                getStockMovements(user),
                user
            );

            setCsvPreview(result);
            setCsvFile(file.name);
        } catch (error) {
            setCsvPreview(null);
            setCsvFile("");
            toast.error(error.message);
        }
    };

    const applyCSV = () => {
        const updates = (csvPreview?.results || [])
            .filter((item) => item.status === "Ready")
            .map((item) => ({
                productId: item.item.productId,
                variantId: item.item.variantId,
                sku: item.sku,
                mode: csvMode,
                quantity: item.stock,
                reason: csvMode === "add"
                    ? "CSV stock receipt"
                    : "CSV stock count correction",
                note: csvFile,
                reference: csvPreview.reference,
                eventKey: item.eventKey,
            }));

        if (!updates.length) return;

        try {
            const result = applyInventoryMovements(user, updates);

            setCsvPreview(null);
            setCsvFile("");

            refresh();

            if (result.errors.length || result.duplicates) {
                toast.warning(
                    `${result.updated} updated, ${
                        result.errors.length + result.duplicates
                    } skipped.`
                );
            } else {
                toast.success(
                    `${result.updated} stock movements saved.`
                );
            }
        } catch {
            toast.error("Unable to apply CSV stock movements.");
        }
    };

    const downloadTemplate = () => {
        downloadCSV("zupito_stock_template.csv", [
            ["sku", "stock"],
            ...inventory.map((item) => [
                item.sku,
                item.onHand,
            ]),
        ]);
    };

    const downloadHistory = () => {
        downloadCSV("zupito_stock_history.csv", [
            [
                "date",
                "product",
                "sku",
                "type",
                "before",
                "change",
                "after",
                "reason",
                "reference",
                "actor",
            ],
            ...filteredHistory.map((item) => [
                item.date,
                item.productName,
                item.sku,
                item.type,
                item.before,
                item.change,
                item.after,
                item.reason,
                item.reference,
                item.actor,
            ]),
        ]);
    };

    const focusHistory = (sku) => {
        setHistoryQuery(sku);
        setHistoryType("All");
        setHistoryPage(0);

        document.getElementById("seller-stock-history")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
    };

    const readyCount = csvPreview?.results.filter((item) =>
        item.status === "Ready"
    ).length || 0;

    const invalidCount = csvPreview?.results.filter((item) =>
        item.status === "Invalid"
    ).length || 0;

    return (
        <main className="seller-inventory">
            {/* ================== PAGE HEADER ================== */}
            <header className="si-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-boxes-stacked"
                            aria-hidden="true"
                        />
                        INVENTORY
                    </h1>

                    <p>
                        Track stock, received and sold units,
                        adjustments and movement history.
                    </p>
                </div>

                <div className="si-header-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={
                            <i className="fa-solid fa-arrows-rotate" />
                        }
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setShowImport((previous) => !previous);
                            setCsvPreview(null);
                        }}
                        startIcon={
                            <i className="fa-solid fa-file-csv" />
                        }
                    >
                        Bulk CSV Update
                    </Button>
                </div>
            </header>

            {/* ================== INVENTORY SUMMARY ================== */}
            <section className="si-stats">
                {stats.map((item) => (
                    <div
                        className={`si-stat si-stat-${item.color}`}
                        key={item.label}
                    >
                        <div className="si-stat-top">
                            <span>{item.label}</span>

                            <span className="si-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong>
                            {item.value.toLocaleString("en-IN")}
                        </strong>

                        <small>{item.note}</small>
                    </div>
                ))}
            </section>

            {/* ================== STOCK ALERTS ================== */}
            {(low + out > 0) && (
                <section className="si-alert">
                    <span className="si-alert-icon">
                        <i className="fa-solid fa-triangle-exclamation" />
                    </span>

                    <div>
                        <strong>Stock attention required</strong>
                        <p>
                            {low} low-stock and {out} out-of-stock
                            SKU(s) need review.
                        </p>
                    </div>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setFilter("Needs Attention");
                            setPage(0);
                        }}
                    >
                        View Alerts
                    </Button>
                </section>
            )}

            {/* ================== BULK CSV UPDATE ================== */}
            {showImport && (
                <section className="si-card si-import">
                    <div className="si-card-heading">
                        <span className="si-heading-icon">
                            <i className="fa-solid fa-file-arrow-up" />
                        </span>

                        <div>
                            <h2>Bulk Stock Update</h2>
                            <p>
                                Preview, validate and record
                                SKU-based stock movements.
                            </p>
                        </div>
                    </div>

                    <div className="si-import-controls">
                        <div className="si-import-text">
                            <strong>CSV columns: sku,stock</strong>

                            <p>
                                Set Quantity replaces stock.
                                Add Stock receives extra units.
                                Repeated Add imports are detected.
                            </p>
                        </div>

                        <div className="si-import-buttons">
                            <TextField
                                select
                                size="small"
                                label="Import Mode"
                                value={csvMode}
                                onChange={(event) => {
                                    setCsvMode(event.target.value);
                                    setCsvPreview(null);
                                }}
                            >
                                <MenuItem value="set">
                                    Set Quantity
                                </MenuItem>

                                <MenuItem value="add">
                                    Add Stock
                                </MenuItem>
                            </TextField>

                            <Button
                                variant="outlined"
                                onClick={downloadTemplate}
                                startIcon={
                                    <i className="fa-solid fa-download" />
                                }
                            >
                                Download Template
                            </Button>

                            <Button
                                variant="contained"
                                component="label"
                                startIcon={
                                    <i className="fa-solid fa-upload" />
                                }
                            >
                                Choose CSV

                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    hidden
                                    onChange={handleCSV}
                                />
                            </Button>
                        </div>
                    </div>

                    {csvPreview && (
                        <div className="si-csv-results">
                            <div className="si-preview-summary">
                                <div>
                                    <strong>{csvFile}</strong>

                                    <p>
                                        {readyCount} ready ·{" "}
                                        {invalidCount} invalid ·{" "}
                                        {csvPreview.results.length -
                                            readyCount -
                                            invalidCount} unchanged
                                    </p>
                                </div>

                                <div className="si-preview-actions">
                                    <Button
                                        variant="outlined"
                                        onClick={() =>
                                            setCsvPreview(null)
                                        }
                                    >
                                        Clear
                                    </Button>

                                    <Button
                                        variant="contained"
                                        disabled={!readyCount}
                                        onClick={applyCSV}
                                    >
                                        Apply {readyCount} Updates
                                    </Button>
                                </div>
                            </div>

                            <TableContainer className="si-table-scroll si-preview-scroll">
                                <Table size="small" className="si-table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Row</TableCell>
                                            <TableCell>SKU</TableCell>
                                            <TableCell>Input</TableCell>
                                            <TableCell>After</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Message</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {csvPreview.results.map((item) => (
                                            <TableRow key={item.row}>
                                                <TableCell>{item.row}</TableCell>
                                                <TableCell>{item.sku}</TableCell>
                                                <TableCell>{item.stock}</TableCell>
                                                <TableCell>
                                                    {Number.isFinite(item.after)
                                                        ? item.after
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <InventoryBadge
                                                        value={item.status}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.error || "Valid"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                    )}
                </section>
            )}

            {/* ================== STOCK MANAGEMENT ================== */}
            <section className="si-card si-list-card">
                <div className="si-card-heading si-list-heading">
                    <span className="si-heading-icon">
                        <i className="fa-solid fa-list-check" />
                    </span>

                    <div>
                        <h2>Stock Management</h2>
                        <p>
                            On-hand, reserved and available quantities
                            by product variant.
                        </p>
                    </div>

                    <span className="si-record-count">
                        {filtered.length} SKUs
                    </span>
                </div>

                <div className="si-toolbar">
                    <TextField
                        size="small"
                        label="Search Product / SKU"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Stock Status"
                        value={filter}
                        onChange={(event) => {
                            setFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {stockFilters.map((value) => (
                            <MenuItem
                                key={value}
                                value={value}
                            >
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        type="number"
                        label="Low Stock At"
                        value={threshold}
                        onChange={(event) =>
                            setThreshold(event.target.value)
                        }
                        onBlur={saveThreshold}
                        slotProps={{
                            htmlInput: {
                                min: 1,
                                max: 100,
                                step: 1,
                            },
                        }}
                    />
                </div>

                <TableContainer className="si-table-scroll">
                    <Table
                        className="si-table"
                        aria-label="Seller stock management"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Variant / SKU</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>On Hand</TableCell>
                                <TableCell>Reserved</TableCell>
                                <TableCell>Available</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((item) => (
                                <TableRow key={item.key} hover>
                                    <TableCell>
                                        <div className="si-product">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="si-placeholder">
                                                    <i className="fa-solid fa-image" />
                                                </span>
                                            )}

                                            <div>
                                                <strong>{item.name}</strong>
                                                <small>{item.productCode}</small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="si-cell-stack">
                                            <strong>{item.variant}</strong>
                                            <small>{item.sku}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {formatMoney(item.price)}
                                    </TableCell>

                                    <TableCell>{item.onHand}</TableCell>
                                    <TableCell>{item.reserved}</TableCell>

                                    <TableCell>
                                        <strong>{item.available}</strong>
                                    </TableCell>

                                    <TableCell>
                                        <InventoryBadge
                                            value={stockState(item, limit)}
                                        />
                                    </TableCell>

                                    <TableCell align="right">
                                        <div className="si-table-actions">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() =>
                                                    openAdjustment(item)
                                                }
                                            >
                                                Adjust
                                            </Button>

                                            <Button
                                                size="small"
                                                onClick={() =>
                                                    focusHistory(item.sku)
                                                }
                                            >
                                                History
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="si-empty">
                                            <i className="fa-solid fa-boxes-stacked" />

                                            <h3>No inventory found</h3>

                                            <p>
                                                {inventory.length
                                                    ? "Try a different search or status filter."
                                                    : "Add a product to start stock tracking."}
                                            </p>

                                            {!inventory.length && (
                                                <Button
                                                    component={Link}
                                                    to="/manage/products/new"
                                                    variant="outlined"
                                                >
                                                    Add Product
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filtered.length}
                    page={Math.min(
                        page,
                        Math.max(
                            0,
                            Math.ceil(filtered.length / rowsPerPage) - 1
                        )
                    )}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== STOCK HISTORY ================== */}
            <section
                className="si-card si-list-card si-history"
                id="seller-stock-history"
            >
                <div className="si-card-heading si-list-heading">
                    <span className="si-heading-icon">
                        <i className="fa-solid fa-clock-rotate-left" />
                    </span>

                    <div>
                        <h2>Stock Movement History</h2>
                        <p>
                            Opening balances, receipts, corrections
                            and order-linked movements.
                        </p>
                    </div>

                    <Button
                        variant="outlined"
                        onClick={downloadHistory}
                        startIcon={
                            <i className="fa-solid fa-download" />
                        }
                    >
                        Export CSV
                    </Button>
                </div>

                <div className="si-history-filters">
                    <TextField
                        size="small"
                        label="Search SKU / Product / Reference"
                        value={historyQuery}
                        onChange={(event) => {
                            setHistoryQuery(event.target.value);
                            setHistoryPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Movement Type"
                        value={historyType}
                        onChange={(event) => {
                            setHistoryType(event.target.value);
                            setHistoryPage(0);
                        }}
                    >
                        {movementTypes.map((value) => (
                            <MenuItem
                                key={value}
                                value={value}
                            >
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setHistoryQuery("");
                            setHistoryType("All");
                            setHistoryPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer className="si-table-scroll">
                    <Table className="si-table si-history-table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date / Time</TableCell>
                                <TableCell>Product / SKU</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Before</TableCell>
                                <TableCell>Change</TableCell>
                                <TableCell>After</TableCell>
                                <TableCell>Reason / Reference</TableCell>
                                <TableCell>Actor</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleHistory.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        {new Date(item.date).toLocaleString(
                                            "en-IN",
                                            {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <div className="si-cell-stack">
                                            <strong>
                                                {item.productName}
                                            </strong>
                                            <small>{item.sku}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <InventoryBadge value={item.type} />
                                    </TableCell>

                                    <TableCell>{item.before}</TableCell>

                                    <TableCell>
                                        <strong
                                            className={
                                                item.change > 0
                                                    ? "si-delta-plus"
                                                    : item.change < 0
                                                        ? "si-delta-minus"
                                                        : ""
                                            }
                                        >
                                            {item.change > 0 ? "+" : ""}
                                            {item.change}
                                        </strong>
                                    </TableCell>

                                    <TableCell>{item.after}</TableCell>

                                    <TableCell>
                                        <div className="si-cell-stack">
                                            <strong>{item.reason}</strong>

                                            {item.note && (
                                                <small>{item.note}</small>
                                            )}

                                            {item.reference && (
                                                <small>
                                                    Ref: {item.reference}
                                                </small>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>{item.actor}</TableCell>
                                </TableRow>
                            ))}

                            {!visibleHistory.length && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="si-empty">
                                            <i className="fa-solid fa-clock-rotate-left" />

                                            <h3>No movements found</h3>
                                            <p>
                                                Stock changes will appear here
                                                as they are recorded.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filteredHistory.length}
                    page={Math.min(
                        historyPage,
                        Math.max(
                            0,
                            Math.ceil(filteredHistory.length / historyRows) - 1
                        )
                    )}
                    rowsPerPage={historyRows}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setHistoryPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setHistoryRows(Number(event.target.value));
                        setHistoryPage(0);
                    }}
                />
            </section>

            {/* ================== STOCK ADJUSTMENT MODAL ================== */}
            <Dialog
                open={Boolean(editRow)}
                onClose={() => setEditRow(null)}
                fullWidth
                maxWidth="sm"
                className="si-dialog"
            >
                <DialogTitle>Adjust Stock</DialogTitle>

                <DialogContent dividers>
                    {editRow && (
                        <div className="si-dialog-content">
                            <div className="si-dialog-summary">
                                <strong>
                                    {editRow.name} · {editRow.variant}
                                </strong>

                                <small>
                                    SKU: {editRow.sku} · On hand:{" "}
                                    {editRow.onHand} · Reserved:{" "}
                                    {editRow.reserved}
                                </small>
                            </div>

                            <div className="si-dialog-fields">
                                <TextField
                                    select
                                    fullWidth
                                    label="Movement Type"
                                    value={mode}
                                    onChange={(event) => {
                                        setMode(event.target.value);
                                        setQuantity("");
                                    }}
                                >
                                    <MenuItem value="add">
                                        Add Stock (Restock)
                                    </MenuItem>

                                    <MenuItem value="set">
                                        Set Quantity (Stock Count)
                                    </MenuItem>

                                    <MenuItem value="remove">
                                        Remove Stock (Damage / Loss)
                                    </MenuItem>
                                </TextField>

                                <TextField
                                    type="number"
                                    fullWidth
                                    label={
                                        mode === "set"
                                            ? "New On-Hand Quantity"
                                            : "Quantity"
                                    }
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    error={Boolean(
                                        quantity && invalidAdjustment
                                    )}
                                    helperText={
                                        quantity && invalidAdjustment
                                            ? "Enter a valid quantity without reducing reserved stock."
                                            : " "
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: mode === "set"
                                                ? editRow.reserved
                                                : 1,
                                            max: MAX_STOCK,
                                            step: 1,
                                        },
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label={
                                        mode === "add"
                                            ? "Supplier / Notes (Optional)"
                                            : "Reason for Change"
                                    }
                                    value={reason}
                                    onChange={(event) =>
                                        setReason(event.target.value)
                                    }
                                    required={mode !== "add"}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 160,
                                        },
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label="Reference (Optional)"
                                    value={reference}
                                    onChange={(event) =>
                                        setReference(event.target.value)
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 80,
                                        },
                                    }}
                                />
                            </div>

                            <div className="si-dialog-result">
                                On Hand:
                                <strong>{editRow.onHand}</strong>

                                <i className="fa-solid fa-arrow-right" />

                                <strong>
                                    {isValidQuantity(quantity) &&
                                    adjustedQuantity >= 0 &&
                                    adjustedQuantity <= MAX_STOCK
                                        ? adjustedQuantity
                                        : "—"}
                                </strong>
                            </div>
                        </div>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setEditRow(null)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disabled={invalidAdjustment}
                        onClick={saveAdjustment}
                    >
                        Save Movement
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default Inventory;
