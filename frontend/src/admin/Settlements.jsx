
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
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

import { sortNewestFirst } from "../utils/sortNewestFirst";

// ================== SETTLEMENT CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_settlements";

const sampleSales = [
    ["SL1012", "TechNova Electronics", "SIM-ORD-7012", 5400, 10, -100, "Eligible", "2026-11-05", "Promotion adjustment"],
    ["SL1011", "Urban Fashion", "SIM-ORD-7011", 2800, 10, 0, "Eligible", "2026-11-05", ""],
    ["SL1010", "TechNova Electronics", "SIM-ORD-7010", 2100, 10, 0, "Eligible", "2026-11-04", ""],
    ["SL1009", "Fresh Basket", "SIM-ORD-7009", 1800, 8, -40, "Eligible", "2026-11-04", "Seller adjustment"],
    ["SL1008", "Urban Fashion", "SIM-ORD-7008", 4600, 10, 0, "Held", "2026-11-03", "Unresolved replacement"],
    ["SL1007", "GlowCare Store", "SIM-ORD-7007", 990, 10, 0, "Excluded", "2026-11-02", "Order cancelled and refunded"],
    ["SL1006", "TechNova Electronics", "SIM-ORD-7006", 7500, 10, 0, "Awaiting", "2026-11-02", "Payment verification pending"],
    ["SL1005", "HomeCraft Living", "SIM-ORD-7005", 3150, 10, -80, "Eligible", "2026-10-30", "Seller adjustment"],
    ["SL1004", "TravelMate Store", "SIM-ORD-7004", 3200, 10, 0, "Eligible", "2026-10-29", ""],
    ["SL1003", "Fresh Basket", "SIM-ORD-7003", 1200, 8, 0, "Excluded", "2026-10-27", "Cancellation refund"],
    ["SL1002", "Urban Fashion", "SIM-ORD-7002", 2200, 10, 0, "Eligible", "2026-10-27", ""],
    ["SL1001", "TravelMate Store", "SIM-ORD-7001", 6600, 10, 0, "Held", "2026-10-25", "Open customer dispute"],
].map((row) => ({
    id: row[0],
    seller: row[1],
    orderId: row[2],
    grossAmount: row[3],
    commissionRate: row[4],
    adjustment: row[5],
    status: row[6],
    earnedAt: `${row[7]}T12:00:00+05:30`,
    note: row[8],
}));

// ================== HELPERS ==================
function roundPaise(rupees) {
    return Math.round(Number(rupees || 0) * 100);
}

function calculateLine(line) {
    const gross = roundPaise(line.grossAmount);
    const commission = Math.round(gross * Number(line.commissionRate) / 100);
    const adjustment = roundPaise(line.adjustment);

    return {
        gross,
        commission,
        adjustment,
        payable: line.status === "Excluded"
            ? 0
            : Math.max(0, gross - commission + adjustment),
    };
}

function sumValues(items, key) {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function getWeekPeriod(dateValue) {
    const start = new Date(dateValue);

    start.setUTCHours(0, 0, 0, 0);

    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - ((day + 6) % 7));

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}

function createBatchId(seller, periodStart) {
    const sellerCode = seller
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `SB-${periodStart.replace(/-/g, "")}-${sellerCode}`;
}

function prepareBatches(data) {
    const allocated = new Set(
        data.batches.flatMap((batch) => batch.lineIds)
    );

    const groups = new Map();

    for (const line of data.ledger) {
        if (line.status !== "Eligible" || allocated.has(line.id)) continue;

        const period = getWeekPeriod(line.earnedAt);
        const batchId = createBatchId(line.seller, period.start);

        if (data.batches.some((batch) => batch.id === batchId)) {
            continue;
        }

        if (!groups.has(batchId)) {
            groups.set(batchId, {
                id: batchId,
                seller: line.seller,
                periodStart: period.start,
                periodEnd: period.end,
                lines: [],
            });
        }

        groups.get(batchId).lines.push(line);
    }

    const preparedAt = new Date().toISOString();

    const newBatches = [...groups.values()].map((group) => {
        const amounts = group.lines.map(calculateLine);

        return {
            id: group.id,
            seller: group.seller,
            periodStart: group.periodStart,
            periodEnd: group.periodEnd,
            lineIds: group.lines.map((line) => line.id),
            gross: sumValues(amounts, "gross"),
            commission: sumValues(amounts, "commission"),
            adjustments: sumValues(amounts, "adjustment"),
            payable: sumValues(amounts, "payable"),
            status: "Prepared",
            preparedAt,
            confirmedAt: null,
            confirmedDate: null,
            reference: null,
            confirmationNote: "",
            history: [
                {
                    status: "Prepared",
                    date: preparedAt,
                    note: "Eligible unpaid earnings grouped into a settlement batch.",
                },
            ],
        };
    });

    return {
        ...data,
        batches: [...data.batches, ...newBatches],
    };
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved?.ledger) && Array.isArray(saved?.batches)) {
            return prepareBatches(saved);
        }
    } catch {
        // Initialize preview records.
    }

    return prepareBatches({
        ledger: sampleSales,
        batches: [],
    });
}

const moneyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatMoney(paise) {
    return moneyFormatter.format(Number(paise || 0) / 100);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          });
}

function todayLocal() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function StatusBadge({ value }) {
    const theme = {
        Prepared: "warning",
        "Confirmed (Demo)": "success",
        Eligible: "success",
        Held: "warning",
        Excluded: "danger",
        Awaiting: "neutral",
    }[value] || "neutral";

    return <span className={`st-badge st-badge--${theme}`}>{value}</span>;
}

function DetailItem({ label, value }) {
    return (
        <div className="st-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== SETTLEMENT MANAGEMENT ==================
function Settlements() {
    const [data, setData] = useState(loadState);
    const { ledger, batches } = data;

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [sellerFilter, setSellerFilter] = useState("All");
    const [batchFilter, setBatchFilter] = useState("All");
    const [allocationFilter, setAllocationFilter] = useState("All");

    const [batchPage, setBatchPage] = useState(0);
    const [batchRows, setBatchRows] = useState(10);
    const [allocationPage, setAllocationPage] = useState(0);
    const [allocationRows, setAllocationRows] = useState(10);

    // ================== DETAILS AND CONFIRMATION ==================
    const [selectedId, setSelectedId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [form, setForm] = useState({
        amount: "",
        reference: "",
        date: "",
        note: "",
    });
    const [formError, setFormError] = useState("");

    const selectedBatch = batches.find((batch) => batch.id === selectedId);
    const confirmingBatch = batches.find((batch) => batch.id === confirmId);

    const sellers = [...new Set(ledger.map((line) => line.seller))].sort();

    // ================== STORAGE ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Continue with React state.
        }
    }, [data]);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Sales Allocations",
            value: ledger.length,
            description: "Illustrative seller sales records",
            theme: "blue",
            icon: "fa-chart-column",
        },
        {
            label: "Prepared Batches",
            value: batches.filter((batch) => batch.status === "Prepared").length,
            description: "Awaiting admin confirmation",
            theme: "orange",
            icon: "fa-clock",
        },
        {
            label: "Confirmed Batches",
            value: batches.filter((batch) => batch.status === "Confirmed (Demo)").length,
            description: "Recorded settlement confirmations",
            theme: "green",
            icon: "fa-circle-check",
        },
        {
            label: "Held / Excluded",
            value: ledger.filter((line) =>
                ["Held", "Excluded"].includes(line.status)
            ).length,
            description: "Not included in current payouts",
            theme: "red",
            icon: "fa-shield-halved",
        },
    ];

    const pendingAmount = sumValues(
        batches.filter((batch) => batch.status === "Prepared"),
        "payable"
    );

    const confirmedAmount = sumValues(
        batches.filter((batch) => batch.status === "Confirmed (Demo)"),
        "payable"
    );

    const heldAmount = ledger
        .filter((line) => line.status === "Held")
        .reduce((total, line) => total + calculateLine(line).payable, 0);

    // ================== BATCH RESULTS ==================
    const filteredBatches = sortNewestFirst(
        batches.filter((batch) => {
            const query = search.trim().toLowerCase();
            const batchLines = ledger.filter((line) =>
                batch.lineIds.includes(line.id)
            );

            const matchesSearch = [
                batch.id,
                batch.seller,
                batch.reference,
                ...batchLines.flatMap((line) => [line.id, line.orderId]),
            ].some((value) => String(value || "").toLowerCase().includes(query));

            return matchesSearch &&
                (sellerFilter === "All" || batch.seller === sellerFilter) &&
                (batchFilter === "All" || batch.status === batchFilter);
        }),
        "preparedAt"
    );

    const visibleBatches = filteredBatches.slice(
        batchPage * batchRows,
        (batchPage + 1) * batchRows
    );

    // ================== SALES ALLOCATIONS ==================
    const filteredAllocations = sortNewestFirst(
        ledger.filter((line) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                line.id,
                line.orderId,
                line.seller,
                line.note,
            ].some((value) => String(value || "").toLowerCase().includes(query));

            return matchesSearch &&
                (sellerFilter === "All" || line.seller === sellerFilter) &&
                (allocationFilter === "All" || line.status === allocationFilter);
        }),
        "earnedAt"
    );

    const visibleAllocations = filteredAllocations.slice(
        allocationPage * allocationRows,
        (allocationPage + 1) * allocationRows
    );

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setSellerFilter("All");
        setBatchFilter("All");
        setAllocationFilter("All");
        setBatchPage(0);
        setAllocationPage(0);
    };

    const handleRefresh = () => {
        const previousCount = batches.length;
        const refreshed = loadState();

        setData(refreshed);
        setBatchPage(0);
        setAllocationPage(0);

        const newCount = refreshed.batches.length - previousCount;

        toast.info(newCount > 0
            ? `${newCount} eligible settlement batch(es) prepared.`
            : "Settlement records refreshed.");
    };

    // ================== SETTLEMENT CONFIRMATION ==================
    const openConfirmation = (batch) => {
        setSelectedId(null);
        setConfirmId(batch.id);

        setForm({
            amount: (batch.payable / 100).toFixed(2),
            reference: "",
            date: todayLocal(),
            note: "",
        });

        setFormError("");
    };

    const closeConfirmation = () => {
        setConfirmId(null);
        setFormError("");
    };

    const handleConfirmation = () => {
        if (!confirmingBatch || confirmingBatch.status !== "Prepared") {
            toast.error("Settlement is no longer awaiting confirmation.");
            closeConfirmation();
            return;
        }

        const amount = Number(form.amount);
        const reference = form.reference.trim();
        const date = form.date;
        const note = form.note.trim();

        if (!Number.isFinite(amount) ||
            Math.round(amount * 100) !== confirmingBatch.payable) {
            setFormError("Confirmation amount must exactly match the payable amount.");
            return;
        }

        if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{5,59}$/.test(reference)) {
            setFormError("Enter a valid reference of 6–60 characters (letters, numbers, /, _ or -).");
            return;
        }

        if (batches.some((batch) =>
            batch.reference?.toLowerCase() === reference.toLowerCase()
        )) {
            setFormError("This settlement reference is already recorded.");
            return;
        }

        if (!date || date < confirmingBatch.preparedAt.slice(0, 10) ||
            date > todayLocal()) {
            setFormError("Select a date from the batch preparation date through today.");
            return;
        }

        if (note.length > 300) {
            setFormError("The internal note cannot exceed 300 characters.");
            return;
        }

        const now = new Date().toISOString();

        setData((previous) => ({
            ...previous,
            batches: previous.batches.map((batch) =>
                batch.id === confirmId && batch.status === "Prepared"
                    ? {
                          ...batch,
                          status: "Confirmed (Demo)",
                          confirmedAt: now,
                          confirmedDate: date,
                          reference,
                          confirmationNote: note,
                          history: [
                              ...(batch.history || []),
                              {
                                  status: "Confirmed (Demo)",
                                  date: now,
                                  note: `Admin recorded settlement reference ${reference}.`,
                              },
                          ],
                      }
                    : batch
            ),
        }));

        toast.success("Settlement confirmation recorded (Demo).");
        closeConfirmation();
    };

    return (
        <div className="manage-settlements">
            {/* ================== PAGE HEADER ================== */}
            <section className="st-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />
                        COMMISSIONS & SETTLEMENTS
                    </span>

                    <p>
                        Monitor seller earnings, commission deductions,
                        adjustments and settlement confirmations.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="st-refresh"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== SUMMARY CARDS ================== */}
            <section className="st-stats">
                {statistics.map((item) => (
                    <article key={item.label} className={`st-stat st-stat--${item.theme}`}>
                        <div className="st-stat-heading">
                            <span>{item.label}</span>

                            <span className="st-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== EARNINGS SUMMARY ================== */}
            <section className="st-earnings">
                <div>
                    <span>Prepared Seller Payable</span>
                    <strong>{formatMoney(pendingAmount)}</strong>
                    <small>Awaiting Admin confirmation</small>
                </div>

                <div>
                    <span>Confirmed Settlements</span>
                    <strong>{formatMoney(confirmedAmount)}</strong>
                    <small>Recorded demo settlement value</small>
                </div>

                <div>
                    <span>Held Earnings</span>
                    <strong>{formatMoney(heldAmount)}</strong>
                    <small>Excluded until disputes are resolved</small>
                </div>
            </section>

            {/* ================== SETTLEMENT BATCHES ================== */}
            <section className="st-card">
                <div className="st-section-header">
                    <div className="st-section-heading">
                        <span className="st-section-icon">
                            <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Settlement Batches</h2>
                            <p>Automatically prepared batches grouped by seller and earning week.</p>
                        </div>
                    </div>

                    <span className="st-record-count">
                        {filteredBatches.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="st-toolbar">
                    <TextField
                        className="st-search"
                        label="Search Settlements"
                        placeholder="Batch ID, seller, order or reference"
                        size="small"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setBatchPage(0);
                            setAllocationPage(0);
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <i className="fa-solid fa-magnifying-glass" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        fullWidth
                    />

                    <TextField
                        select
                        className="st-filter"
                        label="Seller"
                        size="small"
                        value={sellerFilter}
                        onChange={(event) => {
                            setSellerFilter(event.target.value);
                            setBatchPage(0);
                            setAllocationPage(0);
                        }}
                    >
                        <MenuItem value="All">All Sellers</MenuItem>
                        {sellers.map((seller) => (
                            <MenuItem key={seller} value={seller}>{seller}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="st-filter"
                        label="Batch Status"
                        size="small"
                        value={batchFilter}
                        onChange={(event) => {
                            setBatchFilter(event.target.value);
                            setBatchPage(0);
                        }}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Prepared">Prepared</MenuItem>
                        <MenuItem value="Confirmed (Demo)">Confirmed (Demo)</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="st-reset"
                        onClick={resetFilters}
                        disabled={!search && sellerFilter === "All" &&
                            batchFilter === "All" && allocationFilter === "All"}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer className="st-table-scroll">
                    <Table className="st-table" aria-label="Settlement batches">
                        <TableHead>
                            <TableRow>
                                <TableCell>Batch Reference</TableCell>
                                <TableCell>Seller</TableCell>
                                <TableCell>Period</TableCell>
                                <TableCell>Sales</TableCell>
                                <TableCell>Commission</TableCell>
                                <TableCell>Adjustments</TableCell>
                                <TableCell>Seller Payable</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleBatches.map((batch) => (
                                <TableRow key={batch.id} hover>
                                    <TableCell>
                                        <div className="st-cell">
                                            <strong className="st-reference">{batch.id}</strong>
                                            <small>{formatDate(batch.preparedAt)}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="st-cell">
                                            <strong>{batch.seller}</strong>
                                            <small>{batch.lineIds.length} sales allocation(s)</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="st-period">
                                            {formatDate(`${batch.periodStart}T12:00:00+05:30`)}
                                            {" – "}
                                            {formatDate(`${batch.periodEnd}T12:00:00+05:30`)}
                                        </span>
                                    </TableCell>

                                    <TableCell>{formatMoney(batch.gross)}</TableCell>
                                    <TableCell>{formatMoney(batch.commission)}</TableCell>
                                    <TableCell>{formatMoney(batch.adjustments)}</TableCell>

                                    <TableCell>
                                        <strong className="st-payable">
                                            {formatMoney(batch.payable)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge value={batch.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            className="st-view"
                                            onClick={() => setSelectedId(batch.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleBatches.length && (
                                <TableRow>
                                    <TableCell colSpan={9}>
                                        <div className="st-empty">
                                            <i className="fa-solid fa-file-invoice-dollar" />
                                            <h3>No Settlement Batches Found</h3>
                                            <p>Try adjusting the search or filters.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    className="st-pagination"
                    count={filteredBatches.length}
                    page={batchPage}
                    rowsPerPage={batchRows}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setBatchPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setBatchRows(Number(event.target.value));
                        setBatchPage(0);
                    }}
                />
            </section>

            {/* ================== SELLER ALLOCATIONS ================== */}
            <section className="st-card">
                <div className="st-section-header">
                    <div className="st-section-heading">
                        <span className="st-section-icon">
                            <i className="fa-solid fa-chart-pie" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Seller Sales & Adjustments</h2>
                            <p>Illustrative earnings ledger with excluded and held amounts.</p>
                        </div>
                    </div>

                    <span className="st-record-count">
                        {filteredAllocations.length} Records
                    </span>
                </div>

                <div className="st-allocation-toolbar">
                    <TextField
                        select
                        label="Allocation Status"
                        size="small"
                        value={allocationFilter}
                        onChange={(event) => {
                            setAllocationFilter(event.target.value);
                            setAllocationPage(0);
                        }}
                    >
                        <MenuItem value="All">All Allocations</MenuItem>
                        <MenuItem value="Eligible">Eligible</MenuItem>
                        <MenuItem value="Held">Held</MenuItem>
                        <MenuItem value="Excluded">Excluded</MenuItem>
                        <MenuItem value="Awaiting">Awaiting</MenuItem>
                    </TextField>

                    <span>Search and Seller filters above also apply here.</span>
                </div>

                <TableContainer className="st-table-scroll">
                    <Table className="st-table" aria-label="Seller sales allocations">
                        <TableHead>
                            <TableRow>
                                <TableCell>Sale / Order</TableCell>
                                <TableCell>Seller</TableCell>
                                <TableCell>Sale Amount</TableCell>
                                <TableCell>Commission</TableCell>
                                <TableCell>Adjustments</TableCell>
                                <TableCell>Projected Earnings</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Reason</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleAllocations.map((line) => {
                                const amounts = calculateLine(line);

                                return (
                                    <TableRow key={line.id} hover>
                                        <TableCell>
                                            <div className="st-cell">
                                                <strong className="st-reference">{line.id}</strong>
                                                <small>{line.orderId}</small>
                                                <small>{formatDate(line.earnedAt)}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>{line.seller}</TableCell>
                                        <TableCell>{formatMoney(amounts.gross)}</TableCell>
                                        <TableCell>
                                            {formatMoney(amounts.commission)}
                                            <small className="st-subvalue">
                                                {line.commissionRate}% rate
                                            </small>
                                        </TableCell>
                                        <TableCell>{formatMoney(amounts.adjustment)}</TableCell>
                                        <TableCell>
                                            <strong className="st-payable">
                                                {formatMoney(amounts.payable)}
                                            </strong>
                                        </TableCell>
                                        <TableCell><StatusBadge value={line.status} /></TableCell>
                                        <TableCell>
                                            <span className="st-reason">{line.note || "—"}</span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visibleAllocations.length && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="st-empty">
                                            <i className="fa-solid fa-chart-column" />
                                            <h3>No Sales Allocations Found</h3>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    className="st-pagination"
                    count={filteredAllocations.length}
                    page={allocationPage}
                    rowsPerPage={allocationRows}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setAllocationPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setAllocationRows(Number(event.target.value));
                        setAllocationPage(0);
                    }}
                />
            </section>

            {/* ================== BATCH DETAILS ================== */}
            <Dialog
                open={Boolean(selectedBatch)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="md"
                slotProps={{ paper: { className: "st-dialog" } }}
            >
                {selectedBatch && (
                    <>
                        <DialogTitle>Settlement Batch Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="st-detail-banner">
                                <div>
                                    <strong>{selectedBatch.id}</strong>
                                    <p>{selectedBatch.seller}</p>
                                </div>

                                <StatusBadge value={selectedBatch.status} />
                            </div>

                            <div className="st-detail-section">
                                <h4>Batch Information</h4>

                                <dl className="st-detail-grid">
                                    <DetailItem
                                        label="Earning Period"
                                        value={`${selectedBatch.periodStart} to ${selectedBatch.periodEnd}`}
                                    />
                                    <DetailItem
                                        label="Prepared On"
                                        value={formatDate(selectedBatch.preparedAt)}
                                    />
                                    <DetailItem
                                        label="Number of Sales"
                                        value={selectedBatch.lineIds.length}
                                    />
                                    <DetailItem
                                        label="Batch Status"
                                        value={selectedBatch.status}
                                    />
                                </dl>
                            </div>

                            <div className="st-detail-section">
                                <h4>Calculation Summary</h4>

                                <div className="st-calculation">
                                    <div>
                                        <span>Gross Seller Sales</span>
                                        <strong>{formatMoney(selectedBatch.gross)}</strong>
                                    </div>

                                    <div>
                                        <span>Platform Commission</span>
                                        <strong>- {formatMoney(selectedBatch.commission)}</strong>
                                    </div>

                                    <div>
                                        <span>Adjustments</span>
                                        <strong>{formatMoney(selectedBatch.adjustments)}</strong>
                                    </div>

                                    <div className="st-calculation-total">
                                        <span>Final Seller Payable</span>
                                        <strong>{formatMoney(selectedBatch.payable)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="st-detail-section">
                                <h4>Included Sales</h4>

                                <div className="st-included-sales">
                                    {ledger
                                        .filter((line) => selectedBatch.lineIds.includes(line.id))
                                        .map((line) => (
                                            <div key={line.id}>
                                                <div>
                                                    <strong>{line.orderId}</strong>
                                                    <small>{line.id}</small>
                                                </div>

                                                <strong>
                                                    {formatMoney(calculateLine(line).payable)}
                                                </strong>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {selectedBatch.reference && (
                                <div className="st-detail-section">
                                    <h4>Confirmation Information</h4>

                                    <dl className="st-detail-grid">
                                        <DetailItem
                                            label="Settlement Reference"
                                            value={selectedBatch.reference}
                                        />
                                        <DetailItem
                                            label="Confirmation Date"
                                            value={formatDate(
                                                `${selectedBatch.confirmedDate}T12:00:00+05:30`
                                            )}
                                        />
                                        <DetailItem
                                            label="Recorded On"
                                            value={formatDate(selectedBatch.confirmedAt)}
                                        />
                                        <DetailItem
                                            label="Internal Note"
                                            value={selectedBatch.confirmationNote || "None"}
                                        />
                                    </dl>
                                </div>
                            )}

                            <Alert severity="info" className="st-dialog-alert">
                                This is a simulated settlement statement.
                                Confirmation records an admin reference only;
                                no real bank payout is initiated.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="st-dialog-actions">
                            <Button onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedBatch.status === "Prepared" && (
                                <Button
                                    variant="contained"
                                    onClick={() => openConfirmation(selectedBatch)}
                                >
                                    Confirm Settlement
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== CONFIRM SETTLEMENT ================== */}
            <Dialog
                open={Boolean(confirmingBatch)}
                onClose={closeConfirmation}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "st-dialog" } }}
            >
                {confirmingBatch && (
                    <>
                        <DialogTitle>Confirm Settlement (Demo)</DialogTitle>

                        <DialogContent dividers>
                            <div className="st-confirm-info">
                                <span>{confirmingBatch.seller}</span>
                                <strong>{formatMoney(confirmingBatch.payable)}</strong>
                                <small>{confirmingBatch.id}</small>
                            </div>

                            <Alert severity="warning" className="st-dialog-alert">
                                Confirm only after verifying the seller settlement
                                externally. This action records a demo confirmation;
                                it does not transfer funds.
                            </Alert>

                            <div className="st-confirm-fields">
                                <TextField
                                    label="Settlement Amount"
                                    type="number"
                                    value={form.amount}
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            amount: event.target.value,
                                        }));
                                        setFormError("");
                                    }}
                                    slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Settlement Reference"
                                    value={form.reference}
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            reference: event.target.value,
                                        }));
                                        setFormError("");
                                    }}
                                    slotProps={{ htmlInput: { maxLength: 60 } }}
                                    helperText="Unique reference, 6–60 characters."
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Confirmation Date"
                                    type="date"
                                    value={form.date}
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            date: event.target.value,
                                        }));
                                        setFormError("");
                                    }}
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        htmlInput: {
                                            min: confirmingBatch.preparedAt.slice(0, 10),
                                            max: todayLocal(),
                                        },
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Internal Note (Optional)"
                                    value={form.note}
                                    onChange={(event) => setForm((previous) => ({
                                        ...previous,
                                        note: event.target.value,
                                    }))}
                                    slotProps={{ htmlInput: { maxLength: 300 } }}
                                    multiline
                                    minRows={2}
                                    fullWidth
                                />
                            </div>

                            {formError && (
                                <Alert severity="error" className="st-dialog-alert">
                                    {formError}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="st-dialog-actions">
                            <Button onClick={closeConfirmation}>Cancel</Button>
                            <Button variant="contained" onClick={handleConfirmation}>
                                Confirm Record
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default Settlements;
