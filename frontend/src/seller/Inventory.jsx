import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Alert,
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
    fetchInventory,
    fetchInventoryHistory,
    changeInventoryStock,
    importInventoryStock,
} from "../services/sellerService";

const stockFilters = ["All", "In Stock", "Low Stock", "Out of Stock", "Needs Attention"];

const movementTypes = ["All", "Opening", "Restock", "Adjustment", "Damage/Loss"];

function InventoryBadge({ value }) {
    const color = ["In Stock", "Approved", "Restock", "Opening", "Updated"].includes(value)
        ? "success"
        : ["Low Stock", "Pending", "Adjustment", "Skipped"].includes(value)
          ? "warning"
          : ["Out of Stock", "Rejected", "Damage/Loss", "Failed"].includes(value)
            ? "danger"
            : "neutral";

    return (
        <span className={`si-badge si-badge-${color}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {value}
        </span>
    );
}

function downloadCsv(filename, rows) {
    const escape = (value) => {
        let text = String(value ?? "");

        if (/^[=+\-@\t\r\n]/.test(text)) {
            text = `'${text}`;
        }

        return `"${text.replace(/"/g, '""')}"`;
    };

    const content = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Inventory() {
    const [inventory, setInventory] = useState({
        rows: [],
        total: 0,
        statistics: { skus: 0, onHand: 0, reserved: 0, available: 0, low: 0, out: 0 },
    });
    const [history, setHistory] = useState({ rows: [], total: 0 });

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [threshold, setThreshold] = useState(5);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    const [historySearch, setHistorySearch] = useState("");
    const [historyType, setHistoryType] = useState("All");
    const [historySku, setHistorySku] = useState("");
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLimit, setHistoryLimit] = useState(10);

    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [historyError, setHistoryError] = useState("");

    const [action, setAction] = useState(null);
    const [mode, setMode] = useState("add");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [reference, setReference] = useState("");
    const [actionError, setActionError] = useState("");
    const [busy, setBusy] = useState(false);

    const [showImport, setShowImport] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [csvMode, setCsvMode] = useState("add");
    const [csvReference, setCsvReference] = useState("");
    const [csvReason, setCsvReason] = useState("");
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState("");
    const [importing, setImporting] = useState(false);
    const [catalogImport, setCatalogImport] = useState(false);

    const refresh = () => setRevision((value) => value + 1);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setLoadError("");

        const timer = setTimeout(async () => {
            try {
                const result = await fetchInventory(
                    { search, status, threshold, page: page + 1, limit },
                    controller.signal
                );

                if (!active) return;
                setInventory(result);

                const last = Math.max(0, Math.ceil(result.total / limit) - 1);
                if (page > last) setPage(last);
            } catch (error) {
                if (active) setLoadError(error.message);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, status, threshold, page, limit, revision]);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setHistoryLoading(true);
        setHistoryError("");

        const timer = setTimeout(async () => {
            try {
                const result = await fetchInventoryHistory(
                    {
                        search: historySearch,
                        type: historyType,
                        sku: historySku,
                        page: historyPage + 1,
                        limit: historyLimit,
                    },
                    controller.signal
                );

                if (!active) return;
                setHistory(result);

                const last = Math.max(0, Math.ceil(result.total / historyLimit) - 1);

                if (historyPage > last) setHistoryPage(last);
            } catch (error) {
                if (active) setHistoryError(error.message);
            } finally {
                if (active) setHistoryLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [historySearch, historyType, historySku, historyPage, historyLimit, revision]);

    const openAction = (row) => {
        setAction({ ...row, operationId: crypto.randomUUID() });
        setMode("add");
        setQuantity("");
        setReason("");
        setReference("");
        setActionError("");
    };

    const saveStock = async () => {
        if (busy || !action) return;

        if (!/^(0|[1-9]\d*)$/.test(quantity) || reason.trim().length < 5) {
            setActionError("Enter a valid quantity and a reason of at least 5 characters.");
            return;
        }

        setBusy(true);
        setActionError("");

        try {
            const result = await changeInventoryStock({
                sku: action.sku,
                mode,
                quantity: Number(quantity),
                reason: reason.trim(),
                reference: reference.trim(),
                version: action.version,
                operationId: action.operationId,
            });

            toast.success(result.message);
            setAction(null);
            refresh();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    const selectCsv = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv") || file.size > 256 * 1024 || !file.size) {
            toast.error("Select a non-empty CSV file up to 256 KB.");
            return;
        }

        setCsvFile(file);
        setImportResult(null);
        setImportError("");
    };

    const applyCsv = async () => {
        if (importing) return;

        if (!csvFile || !/^[A-Z0-9_-]{3,80}$/.test(csvReference.trim().toUpperCase())) {
            setImportError("Select a CSV and enter a valid batch reference.");
            return;
        }

        if (csvReason.trim().length < 5) {
            setImportError("Enter an import reason of at least 5 characters.");
            return;
        }

        setImporting(true);
        setImportError("");

        try {
            const result = await importInventoryStock(
                csvFile,
                {
                    mode: csvMode,
                    reference: csvReference.trim().toUpperCase(),
                    reason: csvReason.trim(),
                },
                catalogImport
            );

            setImportResult(result);
            refresh();

            if (result.summary.failed) {
                toast.warning("Import finished with some failed rows.");
            } else {
                toast.success("Stock import processed.");
            }
        } catch (error) {
            setImportError(
                `${error.message} If the request was interrupted, retry with the same batch reference.`
            );
            refresh();
        } finally {
            setImporting(false);
        }
    };

    const viewHistory = (sku) => {
        setHistorySku(sku);
        setHistoryPage(0);
        document.getElementById("inventory-history")?.scrollIntoView({
            behavior: "smooth",
        });
    };

    const exportHistory = () => {
        downloadCsv("stock-history-page.csv", [
            [
                "Date",
                "Product",
                "SKU",
                "Type",
                "Before",
                "Change",
                "After",
                "Reason",
                "Reference",
                "Source",
            ],
            ...history.rows.map((row) => [
                row.createdAt,
                row.productName,
                row.sku,
                row.type,
                row.beforeQuantity,
                row.quantityChange,
                row.afterQuantity,
                row.reason,
                row.reference,
                row.source,
            ]),
        ]);
    };

    const stats = inventory.statistics;
    const cards = [
        ["On-Hand Stock", stats.onHand, `${stats.skus} SKUs`, "blue"],
        ["Available Stock", stats.available, "Ready for reservation", "green"],
        ["Reserved Stock", stats.reserved, "Allocated quantities", "orange"],
        [
            "Needs Attention",
            stats.low + stats.out,
            `${stats.low} low · ${stats.out} out of stock`,
            "red",
        ],
    ];

    const nextQuantity =
        action && /^\d+$/.test(quantity)
            ? mode === "add"
                ? action.onHand + Number(quantity)
                : mode === "remove"
                  ? action.onHand - Number(quantity)
                  : Number(quantity)
            : null;

    return (
        <main className="seller-inventory">
            <header className="si-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-boxes-stacked" /> INVENTORY
                    </h1>
                    <p>Manage SKU stock, monitor availability and review stock movements.</p>
                </div>
                <div className="si-header-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        disabled={loading || busy || importing}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setShowImport((value) => !value)}
                        disabled={busy || importing}
                    >
                        {showImport ? "Close Import" : "Bulk Stock Update"}
                    </Button>
                </div>
            </header>

            {loadError && <Alert severity="error">{loadError}</Alert>}

            <section className="si-stats">
                {cards.map(([label, value, note, color]) => (
                    <article className={`si-stat si-stat-${color}`} key={label}>
                        <div className="si-stat-top">
                            <span>{label}</span>
                            <span className="si-stat-icon">
                                <i className="fa-solid fa-boxes-stacked" />
                            </span>
                        </div>
                        <strong>{loading || loadError ? "—" : value}</strong>
                        <p>{note}</p>
                    </article>
                ))}
            </section>

            {!loading && !loadError && stats.low + stats.out > 0 && (
                <section className="si-alert">
                    <span className="si-alert-icon">
                        <i className="fa-solid fa-triangle-exclamation" />
                    </span>
                    <p>{stats.low + stats.out} SKUs need stock attention.</p>
                </section>
            )}

            {showImport && (
                <section className="si-card si-import">
                    <div className="si-card-heading">
                        <span className="si-heading-icon">
                            <i className="fa-solid fa-file-csv" />
                        </span>
                        <div>
                            <h2>Bulk Stock Update</h2>
                            <p>
                                {catalogImport
                                    ? "CSV: sku,name,brand,categoryid,description,variant,price,mrp,stock. New listings require images, specifications and approval."
                                    : "CSV columns: sku,stock."}{" "}
                                Maximum 300 rows and 256 KB.
                            </p>
                        </div>
                    </div>

                    <Alert severity="info">
                        Use the same batch reference when retrying an import. Use a new reference
                        only for a genuinely new stock event. “Set Stock” means final on-hand
                        quantity.
                    </Alert>

                    <div className="si-import-controls">
                        <div className="si-import-buttons">
                            <TextField
                                select
                                label="CSV Type"
                                value={catalogImport ? "catalog" : "stock"}
                                onChange={(event) =>
                                    setCatalogImport(event.target.value === "catalog")
                                }
                                disabled={importing}
                            >
                                <MenuItem value="stock">Stock Updates</MenuItem>
                                <MenuItem value="catalog">New Product Listings</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="Import Mode"
                                value={csvMode}
                                onChange={(event) => setCsvMode(event.target.value)}
                                disabled={importing}
                            >
                                <MenuItem value="add">Add Stock</MenuItem>
                                <MenuItem value="set">Set Stock</MenuItem>
                            </TextField>
                            <TextField
                                label="Batch Reference"
                                value={csvReference}
                                onChange={(event) =>
                                    setCsvReference(event.target.value.toUpperCase())
                                }
                                helperText="Example: RECEIPT_20261107_01"
                                slotProps={{ htmlInput: { maxLength: 80 } }}
                                disabled={importing}
                            />
                            <TextField
                                label="Reason"
                                value={csvReason}
                                onChange={(event) => setCsvReason(event.target.value)}
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                disabled={importing}
                            />
                        </div>

                        <div className="si-import-buttons">
                            <Button
                                onClick={() =>
                                    downloadCsv(
                                        catalogImport
                                            ? "catalog-template.csv"
                                            : "stock-template.csv",
                                        catalogImport
                                            ? [
                                                  [
                                                      "sku",
                                                      "name",
                                                      "brand",
                                                      "categoryid",
                                                      "description",
                                                      "variant",
                                                      "price",
                                                      "mrp",
                                                      "stock",
                                                  ],
                                                  [
                                                      "NOVA-X2-BLK",
                                                      "Nova X2 Phone",
                                                      "Nova",
                                                      "REPLACE_WITH_SUBCATEGORY_ID",
                                                      "A detailed product description for this listing.",
                                                      "Black / 128 GB",
                                                      "14999",
                                                      "17999",
                                                      "5",
                                                  ],
                                              ]
                                            : [
                                                  ["sku", "stock"],
                                                  ["NOVA-X1-BLK-128", "5"],
                                                  ["NOVA-X1-BLU-128", "3"],
                                              ]
                                    )
                                }
                            >
                                Download Template
                            </Button>
                            <Button component="label" variant="outlined" disabled={importing}>
                                Select CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={selectCsv}
                                    disabled={importing}
                                />
                            </Button>
                            <Button
                                variant="contained"
                                onClick={applyCsv}
                                disabled={importing || busy || !csvFile}
                            >
                                {importing ? "Processing..." : "Apply CSV"}
                            </Button>
                        </div>
                        {csvFile && <p>{csvFile.name}</p>}
                    </div>

                    {importError && <Alert severity="error">{importError}</Alert>}

                    {importResult && (
                        <div className="si-csv-results">
                            <p>
                                Updated: {importResult.summary.updated} · Unchanged:{" "}
                                {importResult.summary.unchanged} · Skipped:{" "}
                                {importResult.summary.skipped} · Failed:{" "}
                                {importResult.summary.failed}
                            </p>

                            <TableContainer className="si-table-scroll si-preview-scroll">
                                <Table size="small" className="si-table">
                                    <TableHead>
                                        <TableRow>
                                            {[
                                                "Row",
                                                "SKU",
                                                "Result",
                                                "Before",
                                                "After",
                                                "Message",
                                            ].map((label) => (
                                                <TableCell key={label}>{label}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importResult.results.map((row) => (
                                            <TableRow key={row.row}>
                                                <TableCell>{row.row}</TableCell>
                                                <TableCell>{row.sku}</TableCell>
                                                <TableCell>
                                                    <InventoryBadge value={row.outcome} />
                                                </TableCell>
                                                <TableCell>{row.before ?? "—"}</TableCell>
                                                <TableCell>{row.after ?? "—"}</TableCell>
                                                <TableCell>{row.message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </div>
                    )}
                </section>
            )}

            <section className="si-card si-list-card">
                <div className="si-card-heading si-list-heading">
                    <span className="si-heading-icon">
                        <i className="fa-solid fa-list-check" />
                    </span>
                    <div>
                        <h2>Stock Management</h2>
                        <p>On-hand stock includes reserved units.</p>
                    </div>
                    <span className="si-record-count">{inventory.total} SKUs</span>
                </div>

                <div className="si-toolbar">
                    <TextField
                        label="Search Product / SKU"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        size="small"
                    />
                    <TextField
                        select
                        label="Stock Status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                    >
                        {stockFilters.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Low Stock At"
                        type="number"
                        value={threshold}
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isInteger(value) && value >= 1 && value <= 100) {
                                setThreshold(value);
                                setPage(0);
                            }
                        }}
                        slotProps={{ htmlInput: { min: 1, max: 100 } }}
                        size="small"
                    />
                </div>

                <TableContainer className="si-table-scroll">
                    <Table className="si-table">
                        <TableHead>
                            <TableRow>
                                {[
                                    "Product / Variant",
                                    "SKU",
                                    "On Hand",
                                    "Reserved",
                                    "Available",
                                    "Status",
                                    "Actions",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!loading &&
                                !loadError &&
                                inventory.rows.map((row) => (
                                    <TableRow key={`${row.productId}:${row.variantId}`}>
                                        <TableCell>
                                            <div className="si-product">
                                                <img src={row.image} alt="" />
                                                <div>
                                                    <strong>{row.productName}</strong>
                                                    <p>{row.label}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{row.sku}</TableCell>
                                        <TableCell>{row.onHand}</TableCell>
                                        <TableCell>{row.reserved}</TableCell>
                                        <TableCell>{row.available}</TableCell>
                                        <TableCell>
                                            <InventoryBadge
                                                value={
                                                    row.available <= 0
                                                        ? "Out of Stock"
                                                        : row.available <= threshold
                                                          ? "Low Stock"
                                                          : "In Stock"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="si-table-actions">
                                                <Button
                                                    onClick={() => openAction(row)}
                                                    disabled={busy || importing}
                                                >
                                                    Update
                                                </Button>
                                                <Button onClick={() => viewHistory(row.sku)}>
                                                    History
                                                </Button>
                                                <Button
                                                    component={Link}
                                                    to={`/manage/products/${row.productId}/edit`}
                                                >
                                                    Product
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {(loading || loadError || !inventory.rows.length) && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        {loading
                                            ? "Loading inventory..."
                                            : loadError
                                              ? "Unable to load inventory."
                                              : "No inventory found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={inventory.total}
                    page={Math.min(page, Math.max(0, Math.ceil(inventory.total / limit) - 1))}
                    rowsPerPage={limit}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(event) => {
                        setLimit(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            <section id="inventory-history" className="si-card si-list-card si-history">
                <div className="si-card-heading si-list-heading">
                    <span className="si-heading-icon">
                        <i className="fa-solid fa-clock-rotate-left" />
                    </span>
                    <div>
                        <h2>Stock Movement History</h2>
                        <p>Opening stock and subsequent stock changes.</p>
                    </div>
                    <Button
                        onClick={exportHistory}
                        disabled={historyLoading || Boolean(historyError) || !history.rows.length}
                    >
                        Export Current Page
                    </Button>
                </div>

                {historyError && <Alert severity="error">{historyError}</Alert>}

                <div className="si-history-filters">
                    <TextField
                        label="Search SKU / Product / Reference"
                        value={historySearch}
                        onChange={(event) => {
                            setHistorySearch(event.target.value);
                            setHistoryPage(0);
                        }}
                        size="small"
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                    />
                    <TextField
                        select
                        label="Movement Type"
                        value={historyType}
                        onChange={(event) => {
                            setHistoryType(event.target.value);
                            setHistoryPage(0);
                        }}
                        size="small"
                    >
                        {movementTypes.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        onClick={() => {
                            setHistorySearch("");
                            setHistoryType("All");
                            setHistorySku("");
                            setHistoryPage(0);
                        }}
                    >
                        {historySku ? `Clear SKU: ${historySku}` : "Reset"}
                    </Button>
                </div>

                <TableContainer className="si-table-scroll">
                    <Table className="si-table si-history-table">
                        <TableHead>
                            <TableRow>
                                {[
                                    "Date",
                                    "Product / SKU",
                                    "Type",
                                    "Before",
                                    "Change",
                                    "After",
                                    "Reason / Reference",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!historyLoading &&
                                !historyError &&
                                history.rows.map((row) => (
                                    <TableRow key={row._id}>
                                        <TableCell>
                                            {new Date(row.createdAt).toLocaleString("en-IN")}
                                        </TableCell>
                                        <TableCell>
                                            <strong>{row.productName || "Product"}</strong>
                                            <p>{row.sku}</p>
                                        </TableCell>
                                        <TableCell>
                                            <InventoryBadge value={row.type} />
                                        </TableCell>
                                        <TableCell>{row.beforeQuantity}</TableCell>
                                        <TableCell>
                                            {row.quantityChange > 0 ? "+" : ""}
                                            {row.quantityChange}
                                        </TableCell>
                                        <TableCell>{row.afterQuantity}</TableCell>
                                        <TableCell>
                                            <strong>{row.reason}</strong>
                                            {row.note && <p>{row.note}</p>}
                                            <p>{row.reference || "—"}</p>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {(historyLoading || historyError || !history.rows.length) && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        {historyLoading
                                            ? "Loading history..."
                                            : historyError
                                              ? "Unable to load history."
                                              : "No movements found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={history.total}
                    page={Math.min(
                        historyPage,
                        Math.max(0, Math.ceil(history.total / historyLimit) - 1)
                    )}
                    rowsPerPage={historyLimit}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setHistoryPage(value)}
                    onRowsPerPageChange={(event) => {
                        setHistoryLimit(Number(event.target.value));
                        setHistoryPage(0);
                    }}
                />
            </section>

            <Dialog
                open={Boolean(action)}
                onClose={() => !busy && setAction(null)}
                fullWidth
                maxWidth="sm"
                className="si-dialog"
            >
                <DialogTitle>Update Stock</DialogTitle>
                <DialogContent>
                    {action && (
                        <div className="si-dialog-content">
                            <div className="si-dialog-summary">
                                <strong>{action.productName}</strong>
                                <p>
                                    {action.sku} · On hand: {action.onHand} · Reserved:{" "}
                                    {action.reserved}
                                </p>
                            </div>

                            <div className="si-dialog-fields">
                                <TextField
                                    select
                                    label="Movement Type"
                                    value={mode}
                                    onChange={(event) => setMode(event.target.value)}
                                    disabled={busy}
                                >
                                    <MenuItem value="add">Restock — Add Quantity</MenuItem>
                                    <MenuItem value="set">Adjustment — Set Final Stock</MenuItem>
                                    <MenuItem value="remove">
                                        Damage/Loss — Remove Quantity
                                    </MenuItem>
                                </TextField>
                                <TextField
                                    label={mode === "set" ? "Final On-Hand Stock" : "Quantity"}
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                    disabled={busy}
                                    slotProps={{
                                        htmlInput: { inputMode: "numeric", maxLength: 6 },
                                    }}
                                />
                                <TextField
                                    label="Reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    multiline
                                    minRows={2}
                                    disabled={busy}
                                    slotProps={{ htmlInput: { maxLength: 300 } }}
                                    fullWidth
                                />
                                <TextField
                                    label="Reference (Optional)"
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value)}
                                    disabled={busy}
                                    slotProps={{ htmlInput: { maxLength: 80 } }}
                                />
                            </div>

                            <div className="si-dialog-result">
                                {action.onHand} <i className="fa-solid fa-arrow-right" />{" "}
                                {nextQuantity ?? "—"}
                            </div>

                            {actionError && <Alert severity="error">{actionError}</Alert>}
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAction(null)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={saveStock} disabled={busy}>
                        {busy ? "Saving..." : "Save Stock"}
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default Inventory;
