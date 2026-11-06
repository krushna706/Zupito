
import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Collapse,
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

import { getStoreName } from "../services/sellerService";
import { getSellerOrders } from "../services/orderService";

// ================== CONFIGURATION ==================
const SETTLEMENT_KEY = "zupito_admin_settlements";
const SELLERS_KEY = "zupito_admin_sellers";

const allocationStatuses = [
    "All",
    "Eligible",
    "Held",
    "Awaiting",
    "Excluded",
];

const batchStatuses = [
    "All",
    "Prepared",
    "Confirmed (Demo)",
];

const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// ================== STORAGE HELPERS ==================
function readStorage(key) {
    try {
        return JSON.parse(
            localStorage.getItem(key) || "null"
        );
    } catch {
        return null;
    }
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

// ================== FINANCIAL HELPERS ==================
function money(paise) {
    return currency.format(
        Number(paise || 0) / 100
    );
}

function toPaise(rupees) {
    return Math.round(Number(rupees || 0) * 100);
}

function allocationAmounts(line) {
    const gross = toPaise(line.grossAmount);

    const commission = Math.round(
        gross * Number(line.commissionRate || 0) / 100
    );

    const adjustment = toPaise(line.adjustment);

    return {
        gross,
        commission,
        adjustment,
        payable: line.status === "Excluded"
            ? 0
            : Math.max(
                0,
                gross - commission + adjustment
            ),
    };
}

function sum(rows, field) {
    return rows.reduce(
        (total, item) => total + Number(item[field] || 0),
        0
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ================== SELLER MATCHING ==================
function sellerNames(user) {
    const names = new Set();
    const currentStore = getStoreName(user);

    if (currentStore) {
        names.add(normalize(currentStore));
    }

    if (user?.storeName) {
        names.add(normalize(user.storeName));
    }

    const sellers = readStorage(SELLERS_KEY);

    if (Array.isArray(sellers)) {
        sellers.forEach((seller) => {
            const sameId = user?.id &&
                String(seller.id) === String(user.id);

            const sameEmail = user?.email &&
                normalize(seller.email) ===
                normalize(user.email);

            if (sameId || sameEmail) {
                names.add(normalize(seller.storeName));
            }
        });
    }

    return names;
}

function belongsToSeller(record, user, names) {
    if (record.sellerId || record.sellerEmail) {
        const sameId = user?.id &&
            String(record.sellerId) === String(user.id);

        const sameEmail = user?.email &&
            normalize(record.sellerEmail) ===
            normalize(user.email);

        return Boolean(sameId || sameEmail);
    }

    // Older Admin preview allocations use store names.
    return names.has(normalize(record.seller));
}

// ================== EARNINGS DATA ==================
function loadEarnings(user) {
    const data = readStorage(SETTLEMENT_KEY);
    const names = sellerNames(user);

    const allLines = Array.isArray(data?.ledger)
        ? data.ledger
        : [];

    const allBatches = Array.isArray(data?.batches)
        ? data.batches
        : [];

    const lines = allLines
        .filter((line) =>
            belongsToSeller(line, user, names)
        )
        .map((line) => ({
            ...line,
            amounts: allocationAmounts(line),
        }))
        .sort((first, second) =>
            new Date(second.earnedAt) -
            new Date(first.earnedAt)
        );

    const ownedIds = new Set(
        lines.map((line) => line.id)
    );

    const batches = allBatches
        .filter((batch) => {
            const ids = Array.isArray(batch.lineIds)
                ? batch.lineIds
                : [];

            return ids.length > 0 &&
                ids.every((id) => ownedIds.has(id)) &&
                belongsToSeller(batch, user, names);
        })
        .sort((first, second) =>
            new Date(second.preparedAt) -
            new Date(first.preparedAt)
        );

    const allocatedOrders = new Set(
        lines.map((line) => String(line.orderId))
    );

    const unallocatedOrders = getSellerOrders(user)
        .filter((order) =>
            order.status === "delivered" &&
            !allocatedOrders.has(order.orderId)
        );

    return {
        lines,
        batches,
        unallocatedOrders,
        initialized: Boolean(data),
    };
}

// ================== CSV EXPORT ==================
function downloadCSV(filename, rows) {
    const escapeCell = (value) => {
        const text = String(value ?? "");

        const isNumeric = /^-?\d+(\.\d+)?$/.test(text);

        const safe = !isNumeric && /^[=+@\-\t\r]/.test(text)
            ? `'${text}`
            : text;

        return `"${safe.replace(/"/g, '""')}"`;
    };

    const content = rows
        .map((row) =>
            row.map(escapeCell).join(",")
        )
        .join("\r\n");

    const file = new Blob([content], {
        type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

// ================== STATUS BADGE ==================
function StatusBadge({ value }) {
    const themes = {
        Eligible: "success",
        "Confirmed (Demo)": "success",
        Prepared: "warning",
        Held: "warning",
        Excluded: "danger",
        Awaiting: "neutral",
    };

    const theme = themes[value] || "neutral";

    return (
        <span className={`se-badge se-badge-${theme}`}>
            {value}
        </span>
    );
}

// ================== SECTION HEADING ==================
function SectionHeading({ icon, title, description, action }) {
    return (
        <div className="se-section-heading">
            <span className="se-heading-icon">
                <i
                    className={`fa-solid ${icon}`}
                    aria-hidden="true"
                />
            </span>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            {action}
        </div>
    );
}

// ================== SELLER EARNINGS ==================
function Earnings({ user }) {
    const [data, setData] = useState(() =>
        loadEarnings(user)
    );

    const [search, setSearch] = useState("");
    const [allocationFilter, setAllocationFilter] = useState("All");
    const [batchFilter, setBatchFilter] = useState("All");

    const [selectedBatchId, setSelectedBatchId] = useState(null);

    const [allocationPage, setAllocationPage] = useState(0);
    const [batchPage, setBatchPage] = useState(0);

    const [allocationRows, setAllocationRows] = useState(10);
    const [batchRows, setBatchRows] = useState(10);

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setData(loadEarnings(user));
    };

    useEffect(() => {
        const sync = () => {
            setData(loadEarnings(user));
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email, user?.storeName]);

    const {
        lines,
        batches,
        unallocatedOrders,
        initialized,
    } = data;

    // ================== FINANCIAL SUMMARY ==================
    const allocatedIds = new Set(
        batches.flatMap((batch) => batch.lineIds)
    );

    const activeLines = lines.filter((line) =>
        line.status !== "Excluded"
    );

    const gross = sum(
        activeLines.map((line) => line.amounts),
        "gross"
    );

    const commission = sum(
        activeLines.map((line) => line.amounts),
        "commission"
    );

    const prepared = sum(
        batches.filter((batch) =>
            batch.status === "Prepared"
        ),
        "payable"
    );

    const confirmed = sum(
        batches.filter((batch) =>
            batch.status === "Confirmed (Demo)"
        ),
        "payable"
    );

    const unbatched = lines.filter((line) =>
        line.status === "Eligible" &&
        !allocatedIds.has(line.id)
    );

    const held = lines.filter((line) =>
        line.status === "Held"
    );

    const awaiting = lines.filter((line) =>
        line.status === "Awaiting"
    );

    const excluded = lines.filter((line) =>
        line.status === "Excluded"
    );

    const statistics = [
        {
            label: "Gross Allocations",
            value: gross,
            note: "Non-excluded sales allocations",
            icon: "fa-chart-line",
            color: "blue",
        },
        {
            label: "Commission",
            value: commission,
            note: "Marketplace commission deductions",
            icon: "fa-percent",
            color: "orange",
        },
        {
            label: "Prepared Payout",
            value: prepared,
            note: "Awaiting Admin confirmation",
            icon: "fa-clock",
            color: "purple",
        },
        {
            label: "Confirmed (Demo)",
            value: confirmed,
            note: "Admin-recorded confirmations only",
            icon: "fa-circle-check",
            color: "green",
        },
    ];

    // ================== BATCH FILTERS ==================
    const filteredBatches = useMemo(() => {
        const query = search.trim().toLowerCase();

        return batches.filter((batch) => {
            const relatedLines = lines.filter((line) =>
                batch.lineIds.includes(line.id)
            );

            const matchesSearch = [
                batch.id,
                batch.reference,
                ...relatedLines.map((line) => line.orderId),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus = batchFilter === "All" ||
                batch.status === batchFilter;

            return matchesSearch && matchesStatus;
        });
    }, [batches, lines, search, batchFilter]);

    // ================== ALLOCATION FILTERS ==================
    const filteredLines = useMemo(() => {
        const query = search.trim().toLowerCase();

        return lines.filter((line) => {
            const matchesSearch = [
                line.id,
                line.orderId,
                line.note,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus = allocationFilter === "All" ||
                line.status === allocationFilter;

            return matchesSearch && matchesStatus;
        });
    }, [lines, search, allocationFilter]);

    const visibleBatches = filteredBatches.slice(
        batchPage * batchRows,
        (batchPage + 1) * batchRows
    );

    const visibleLines = filteredLines.slice(
        allocationPage * allocationRows,
        (allocationPage + 1) * allocationRows
    );

    const selectedBatch = batches.find((batch) =>
        batch.id === selectedBatchId
    );

    const selectedLines = selectedBatch
        ? lines.filter((line) =>
            selectedBatch.lineIds.includes(line.id)
        )
        : [];

    const resetFilters = () => {
        setSearch("");
        setBatchFilter("All");
        setAllocationFilter("All");
        setBatchPage(0);
        setAllocationPage(0);
    };

    // ================== EXPORT ALLOCATIONS ==================
    const exportAllocations = () => {
        downloadCSV("zupito_seller_earnings.csv", [
            [
                "Allocation",
                "Order",
                "Date",
                "Gross INR",
                "Commission INR",
                "Adjustment INR",
                "Payable INR",
                "Status",
                "Note",
            ],
            ...filteredLines.map((line) => [
                line.id,
                line.orderId,
                line.earnedAt,
                (line.amounts.gross / 100).toFixed(2),
                (line.amounts.commission / 100).toFixed(2),
                (line.amounts.adjustment / 100).toFixed(2),
                (line.amounts.payable / 100).toFixed(2),
                line.status,
                line.note,
            ]),
        ]);

        toast.success("Earnings CSV exported.");
    };

    // ================== EXPORT SETTLEMENTS ==================
    const exportBatches = () => {
        downloadCSV("zupito_seller_settlements.csv", [
            [
                "Batch",
                "Period Start",
                "Period End",
                "Gross INR",
                "Commission INR",
                "Adjustment INR",
                "Payable INR",
                "Status",
                "Reference",
                "Confirmed Date",
            ],
            ...filteredBatches.map((batch) => [
                batch.id,
                batch.periodStart,
                batch.periodEnd,
                (batch.gross / 100).toFixed(2),
                (batch.commission / 100).toFixed(2),
                (batch.adjustments / 100).toFixed(2),
                (batch.payable / 100).toFixed(2),
                batch.status,
                batch.reference,
                batch.confirmedDate,
            ]),
        ]);

        toast.success("Settlement CSV exported.");
    };

    return (
        <main className="seller-earnings">
            {/* ================== PAGE HEADER ================== */}
            <header className="se-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-wallet"
                            aria-hidden="true"
                        />
                        EARNINGS
                    </h1>

                    <p>
                        View commission deductions, order allocations
                        and Admin-confirmed settlement history.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    onClick={refresh}
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" />
                    }
                >
                    Refresh
                </Button>
            </header>

            {/* ================== SUMMARY CARDS ================== */}
            <section className="se-stats">
                {statistics.map((item) => (
                    <article
                        className={`se-stat se-stat-${item.color}`}
                        key={item.label}
                    >
                        <div className="se-stat-heading">
                            <span>{item.label}</span>

                            <span className="se-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong>{money(item.value)}</strong>
                        <small>{item.note}</small>
                    </article>
                ))}
            </section>

            {/* ================== FUNDS BREAKDOWN ================== */}
            <section className="se-funds">
                <div>
                    <span>Eligible · Not Batched</span>

                    <strong>
                        {money(sum(
                            unbatched.map((line) => line.amounts),
                            "payable"
                        ))}
                    </strong>

                    <small>
                        {unbatched.length} allocation(s)
                    </small>
                </div>

                <div>
                    <span>Held for Review</span>

                    <strong>
                        {money(sum(
                            held.map((line) => line.amounts),
                            "payable"
                        ))}
                    </strong>

                    <small>
                        {held.length} allocation(s)
                    </small>
                </div>

                <div>
                    <span>Awaiting Verification</span>

                    <strong>
                        {money(sum(
                            awaiting.map((line) => line.amounts),
                            "payable"
                        ))}
                    </strong>

                    <small>
                        {awaiting.length} allocation(s) · Not payable yet
                    </small>
                </div>
            </section>

            {/* ================== DEMO DISCLAIMER ================== */}
            <div className="se-notice">
                <i
                    className="fa-solid fa-circle-info"
                    aria-hidden="true"
                />

                <p>
                    These are frontend demo records.{" "}
                    <strong>Confirmed (Demo)</strong> means Admin
                    recorded a settlement reference; it does not
                    mean money was transferred. Held, awaiting and
                    excluded allocations are not part of prepared
                    payouts.
                </p>
            </div>

            {!initialized && (
                <div className="se-empty-notice">
                    Settlement records have not been initialized yet.
                    Open Admin → Commissions &amp; Settlements once
                    to load its existing preview allocations, then
                    refresh this page.
                </div>
            )}

            {/* ================== SEARCH ================== */}
            <section className="se-card se-search-card">
                <TextField
                    size="small"
                    label="Search Allocation / Order / Batch / Reference"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setBatchPage(0);
                        setAllocationPage(0);
                    }}
                />

                <Button
                    variant="outlined"
                    onClick={resetFilters}
                >
                    Reset Filters
                </Button>
            </section>

            {/* ================== SETTLEMENT BATCHES ================== */}
            <section className="se-card se-table-card">
                <SectionHeading
                    icon="fa-money-bill-transfer"
                    title="Settlement Batches"
                    description="Weekly batches prepared automatically; final confirmation is controlled by Admin."
                    action={
                        <Button
                            variant="outlined"
                            onClick={exportBatches}
                            startIcon={
                                <i className="fa-solid fa-download" />
                            }
                        >
                            Export CSV
                        </Button>
                    }
                />

                <div className="se-toolbar">
                    <TextField
                        select
                        size="small"
                        label="Batch Status"
                        value={batchFilter}
                        onChange={(event) => {
                            setBatchFilter(event.target.value);
                            setBatchPage(0);
                        }}
                    >
                        {batchStatuses.map((status) => (
                            <MenuItem
                                key={status}
                                value={status}
                            >
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <span>
                        {filteredBatches.length} Batch(es)
                    </span>
                </div>

                <TableContainer className="se-table-scroll">
                    <Table
                        className="se-table"
                        aria-label="Seller settlement batches"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Batch / Period</TableCell>
                                <TableCell>Gross</TableCell>
                                <TableCell>Commission</TableCell>
                                <TableCell>Adjustments</TableCell>
                                <TableCell>Net Payable</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleBatches.map((batch) => (
                                <TableRow hover key={batch.id}>
                                    <TableCell>
                                        <div className="se-cell">
                                            <strong>
                                                {batch.id}
                                            </strong>

                                            <small>
                                                {formatDate(batch.periodStart)}
                                                {" – "}
                                                {formatDate(batch.periodEnd)}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {money(batch.gross)}
                                    </TableCell>

                                    <TableCell>
                                        {money(batch.commission)}
                                    </TableCell>

                                    <TableCell>
                                        {money(batch.adjustments)}
                                    </TableCell>

                                    <TableCell>
                                        <strong>
                                            {money(batch.payable)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge
                                            value={batch.status}
                                        />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                setSelectedBatchId(
                                                    selectedBatchId === batch.id
                                                        ? null
                                                        : batch.id
                                                )
                                            }
                                        >
                                            {selectedBatchId === batch.id
                                                ? "Hide Details"
                                                : "View Details"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleBatches.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="se-empty">
                                            No settlement batches found
                                            for this seller.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filteredBatches.length}
                    page={Math.min(
                        batchPage,
                        Math.max(
                            0,
                            Math.ceil(
                                filteredBatches.length / batchRows
                            ) - 1
                        )
                    )}
                    rowsPerPage={batchRows}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setBatchPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setBatchRows(Number(event.target.value));
                        setBatchPage(0);
                    }}
                />

                {/* ================== BATCH DETAILS ================== */}
                <Collapse
                    in={Boolean(selectedBatch)}
                    unmountOnExit
                >
                    {selectedBatch && (
                        <div className="se-batch-details">
                            <div className="se-detail-header">
                                <h3>
                                    Batch Details · {selectedBatch.id}
                                </h3>

                                <Button
                                    onClick={() =>
                                        setSelectedBatchId(null)
                                    }
                                >
                                    Close
                                </Button>
                            </div>

                            <div className="se-detail-grid">
                                <div>
                                    <span>Prepared At</span>
                                    <strong>
                                        {formatDate(selectedBatch.preparedAt)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Confirmed Date</span>
                                    <strong>
                                        {formatDate(selectedBatch.confirmedDate)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Settlement Reference</span>
                                    <strong>
                                        {selectedBatch.reference ||
                                            "Not confirmed"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Included Orders</span>
                                    <strong>
                                        {selectedLines.length}
                                    </strong>
                                </div>
                            </div>

                            {selectedBatch.confirmationNote && (
                                <p className="se-detail-note">
                                    Admin Note:{" "}
                                    {selectedBatch.confirmationNote}
                                </p>
                            )}

                            <h4>Included Allocations</h4>

                            {selectedLines.map((line) => (
                                <div
                                    className="se-batch-line"
                                    key={line.id}
                                >
                                    <span>{line.orderId}</span>
                                    <span>{line.id}</span>

                                    <strong>
                                        {money(line.amounts.payable)}
                                    </strong>
                                </div>
                            ))}

                            <h4>Batch Activity</h4>

                            {(selectedBatch.history || []).map(
                                (event, index) => (
                                    <div
                                        className="se-activity"
                                        key={`${event.date}-${index}`}
                                    >
                                        <strong>{event.status}</strong>
                                        <span>
                                            {event.note ||
                                                "Status updated."}
                                        </span>
                                        <small>
                                            {formatDate(event.date)}
                                        </small>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </Collapse>
            </section>

            {/* ================== ORDER-WISE EARNINGS ================== */}
            <section className="se-card se-table-card">
                <SectionHeading
                    icon="fa-receipt"
                    title="Order-wise Earnings"
                    description="Gross amounts, commission rates, adjustments and payout eligibility."
                    action={
                        <Button
                            variant="outlined"
                            onClick={exportAllocations}
                            startIcon={
                                <i className="fa-solid fa-download" />
                            }
                        >
                            Export CSV
                        </Button>
                    }
                />

                <div className="se-toolbar">
                    <TextField
                        select
                        size="small"
                        label="Allocation Status"
                        value={allocationFilter}
                        onChange={(event) => {
                            setAllocationFilter(event.target.value);
                            setAllocationPage(0);
                        }}
                    >
                        {allocationStatuses.map((status) => (
                            <MenuItem
                                key={status}
                                value={status}
                            >
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <span>
                        {filteredLines.length} Allocation(s) ·{" "}
                        {excluded.length} excluded overall
                    </span>
                </div>

                <TableContainer className="se-table-scroll">
                    <Table
                        className="se-table se-allocation-table"
                        aria-label="Seller order earnings"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Order / Allocation</TableCell>
                                <TableCell>Gross</TableCell>
                                <TableCell>Commission</TableCell>
                                <TableCell>Adjustment</TableCell>
                                <TableCell>Net Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Remarks</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleLines.map((line) => (
                                <TableRow hover key={line.id}>
                                    <TableCell>
                                        <div className="se-cell">
                                            <strong>
                                                {line.orderId}
                                            </strong>

                                            <small>
                                                {line.id} ·{" "}
                                                {formatDate(line.earnedAt)}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {money(line.amounts.gross)}
                                    </TableCell>

                                    <TableCell>
                                        <div className="se-cell">
                                            <strong>
                                                {money(
                                                    line.amounts.commission
                                                )}
                                            </strong>

                                            <small>
                                                {line.commissionRate}%
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span
                                            className={
                                                line.amounts.adjustment < 0
                                                    ? "se-negative"
                                                    : ""
                                            }
                                        >
                                            {money(
                                                line.amounts.adjustment
                                            )}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <strong>
                                            {money(
                                                line.amounts.payable
                                            )}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge
                                            value={line.status}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <span className="se-remark">
                                            {line.note || "—"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleLines.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="se-empty">
                                            No earnings allocations found.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filteredLines.length}
                    page={Math.min(
                        allocationPage,
                        Math.max(
                            0,
                            Math.ceil(
                                filteredLines.length / allocationRows
                            ) - 1
                        )
                    )}
                    rowsPerPage={allocationRows}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setAllocationPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setAllocationRows(
                            Number(event.target.value)
                        );
                        setAllocationPage(0);
                    }}
                />
            </section>

            {/* ================== UNALLOCATED ORDERS ================== */}
            {unallocatedOrders.length > 0 && (
                <section className="se-card se-unallocated">
                    <SectionHeading
                        icon="fa-hourglass-half"
                        title="Awaiting Financial Allocation"
                        description="Delivered seller orders without an Admin earnings allocation yet."
                    />

                    <p>
                        {unallocatedOrders.length} delivered order(s)
                        are not yet in the settlement ledger.
                        These orders are{" "}
                        <strong>
                            not included in earned or payable totals
                        </strong>{" "}
                        until financial reconciliation.
                    </p>

                    <div className="se-unallocated-orders">
                        {unallocatedOrders.map((order) => (
                            <div
                                className="se-unallocated-order"
                                key={`${order.orderId}-${order.parcelId}`}
                            >
                                <span>
                                    {order.orderId} · {order.parcelId}
                                </span>

                                <strong>
                                    {currency.format(
                                        order.amount || 0
                                    )}
                                </strong>

                                <small>
                                    Awaiting allocation
                                </small>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

export default Earnings;
