
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
    getCategories,
    inventoryRows,
    ownProducts,
} from "../services/sellerService";

import {
    createDemoReplacementRequest,
    getSellerReplacements,
    syncSellerReplacementWorkflow,
} from "../services/replacementService";

// ================== CONFIGURATION ==================
const statuses = [
    "All",
    "Pending",
    "Approved",
    "Pickup Assigned",
    "Picked Up",
    "Inspection",
    "Replacement Ready",
    "Out for Delivery",
    "Completed",
    "Rejected",
];

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

// ================== STATUS BADGE ==================
function StatusBadge({ status }) {
    let tone = "blue";

    if (status === "Completed") {
        tone = "success";
    } else if (status === "Rejected") {
        tone = "danger";
    } else if (
        status === "Pending" ||
        status === "Inspection"
    ) {
        tone = "warning";
    }

    return (
        <span className={`sr-badge sr-badge-${tone}`}>
            {status}
        </span>
    );
}

// ================== SELLER REPLACEMENTS ==================
function Replacements({ user }) {
    const [requests, setRequests] = useState(() =>
        getSellerReplacements(user)
    );

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [demoOpen, setDemoOpen] = useState(false);
    const [demoVariant, setDemoVariant] = useState("");
    const [demoReason, setDemoReason] = useState("Damaged item");
    const [demoDescription, setDemoDescription] = useState("");

    // ================== DATA REFRESH ==================
    const refresh = () => {
        try {
            syncSellerReplacementWorkflow(user);

            setRequests(
                getSellerReplacements(user)
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Unable to synchronize replacements."
            );
        }
    };

    useEffect(() => {
        const sync = () => {
            try {
                syncSellerReplacementWorkflow(user);
            } catch {
                // Continue showing available saved records.
            }

            setRequests(
                getSellerReplacements(user)
            );
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email]);

    // ================== ELIGIBLE DEMO PRODUCTS ==================
    const eligibleVariants = inventoryRows(user).filter((item) => {
        const product = ownProducts(user).find((record) =>
            record.id === item.productId
        );

        const category = getCategories().find((record) =>
            record.slug === product?.category
        );

        return item.available >= 2 &&
            category?.replacementAllowed === true &&
            category?.status === "Active";
    });

    // ================== DEMO REQUEST ==================
    const createDemo = () => {
        try {
            createDemoReplacementRequest(
                user,
                demoVariant,
                demoReason,
                demoDescription
            );

            setDemoOpen(false);
            setDemoDescription("");

            refresh();

            toast.success(
                "Sample replacement request created."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ================== SUMMARY ==================
    const statistics = [
        {
            label: "Total Requests",
            value: requests.length,
            note: "All replacement requests",
            icon: "fa-arrow-right-arrow-left",
            tone: "blue",
        },
        {
            label: "Awaiting Decision",
            value: requests.filter((item) =>
                item.status === "Pending" &&
                (item.sellerDecision || "Awaiting") === "Awaiting"
            ).length,
            note: "Requires seller response",
            icon: "fa-clock",
            tone: "orange",
        },
        {
            label: "In Progress",
            value: requests.filter((item) =>
                !["Pending", "Completed", "Rejected"].includes(item.status)
            ).length,
            note: "Return and delivery workflow",
            icon: "fa-truck-fast",
            tone: "green",
        },
        {
            label: "Completed",
            value: requests.filter((item) =>
                item.status === "Completed"
            ).length,
            note: "Delivered replacements",
            icon: "fa-circle-check",
            tone: "purple",
        },
    ];

    // ================== SEARCH AND FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return requests.filter((item) => {
            const matchesSearch = [
                item.id,
                item.orderId,
                item.productName,
                item.customerName,
                item.reason,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus = status === "All" ||
                item.status === status;

            return matchesSearch && matchesStatus;
        });
    }, [requests, search, status]);

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    return (
        <main className="seller-replacements">
            {/* ================== PAGE HEADER ================== */}
            <header className="sr-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-arrow-right-arrow-left"
                            aria-hidden="true"
                        />
                        REPLACEMENTS
                    </h1>

                    <p>
                        Confirm requests, inspect returned items
                        and prepare approved replacement parcels.
                    </p>
                </div>

                <div className="sr-header-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setDemoVariant(
                                eligibleVariants[0]?.key || ""
                            );
                            setDemoOpen(true);
                        }}
                        startIcon={
                            <i className="fa-solid fa-flask" />
                        }
                    >
                        Create Demo Request
                    </Button>
                </div>
            </header>

            {/* ================== STATISTICS ================== */}
            <section className="sr-stats">
                {statistics.map((item) => (
                    <article
                        className={`sr-stat sr-stat-${item.tone}`}
                        key={item.label}
                    >
                        <div className="sr-stat-top">
                            <span>{item.label}</span>

                            <span className="sr-stat-icon">
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
                    </article>
                ))}
            </section>

            {/* ================== REQUEST LIST ================== */}
            <section className="sr-card sr-list-card">
                <div className="sr-card-heading sr-list-heading">
                    <span className="sr-heading-icon">
                        <i
                            className="fa-solid fa-clipboard-list"
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <h2>Replacement Requests</h2>

                        <p>
                            Seller-specific requests shared with
                            Admin Replacement Management.
                        </p>
                    </div>

                    <span className="sr-record-count">
                        {filtered.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="sr-toolbar">
                    <TextField
                        size="small"
                        label="Search Request / Order / Product"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Request Status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(0);
                        }}
                    >
                        {statuses.map((item) => (
                            <MenuItem
                                key={item}
                                value={item}
                            >
                                {item}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearch("");
                            setStatus("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== REQUESTS TABLE ================== */}
                <TableContainer className="sr-table-wrap">
                    <Table
                        className="sr-table"
                        aria-label="Seller replacement requests"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Request / Order</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Seller Response</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((item) => (
                                <TableRow
                                    key={item.id}
                                    hover
                                >
                                    <TableCell>
                                        <div className="sr-cell-stack">
                                            <strong>{item.id}</strong>
                                            <small>{item.orderId}</small>
                                            <small>
                                                {formatDate(item.requestedAt)}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="sr-cell-stack sr-product-cell">
                                            <strong>
                                                {item.productName}
                                            </strong>

                                            <small>
                                                Qty: {item.quantity}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {item.customerName || "Customer"}
                                    </TableCell>

                                    <TableCell>{item.reason}</TableCell>

                                    <TableCell>
                                        {item.sellerDecision || "Awaiting"}
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge status={item.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            component={Link}
                                            to={`/manage/replacements/${
                                                encodeURIComponent(item.id)
                                            }`}
                                            variant="outlined"
                                            size="small"
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="sr-empty">
                                            <i
                                                className="fa-solid fa-box-open"
                                                aria-hidden="true"
                                            />

                                            <h3>
                                                No replacement requests found
                                            </h3>

                                            <p>
                                                {requests.length
                                                    ? "Try changing the search or status filter."
                                                    : "Customer replacement requests appear here after submission. Existing Admin previews are matched using the registered store name."}
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
                    onPageChange={(_, nextPage) =>
                        setPage(nextPage)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(
                            Number(event.target.value)
                        );
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== CREATE DEMO REQUEST ================== */}
            <Dialog
                open={demoOpen}
                onClose={() => setDemoOpen(false)}
                fullWidth
                maxWidth="sm"
                className="sr-demo-dialog"
            >
                <DialogTitle>
                    Create Replacement Demo
                </DialogTitle>

                <DialogContent dividers>
                    <div className="sr-demo-fields">
                        <p>
                            Simulates a paid, delivered demo order
                            and records its one-unit sale before
                            creating a customer replacement request.
                        </p>

                        <TextField
                            select
                            size="small"
                            label="Eligible Seller Product"
                            value={demoVariant}
                            onChange={(event) =>
                                setDemoVariant(event.target.value)
                            }
                            fullWidth
                        >
                            {eligibleVariants.map((item) => (
                                <MenuItem
                                    key={item.key}
                                    value={item.key}
                                >
                                    {item.name} · {item.variant} (
                                    {item.available} available)
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            label="Customer Reason"
                            value={demoReason}
                            onChange={(event) =>
                                setDemoReason(event.target.value)
                            }
                            fullWidth
                        >
                            <MenuItem value="Damaged item">
                                Damaged Item
                            </MenuItem>

                            <MenuItem value="Wrong item received">
                                Wrong Item Received
                            </MenuItem>

                            <MenuItem value="Defective or not working">
                                Defective / Not Working
                            </MenuItem>
                        </TextField>

                        <TextField
                            size="small"
                            label="Customer Description"
                            value={demoDescription}
                            onChange={(event) =>
                                setDemoDescription(event.target.value)
                            }
                            slotProps={{
                                htmlInput: { maxLength: 300 },
                            }}
                            multiline
                            minRows={3}
                            fullWidth
                        />

                        {!eligibleVariants.length && (
                            <p>
                                No eligible variants. Configure replacement
                                policy in Admin Categories, pickup pincode
                                in Store Profile, and 2+ available units.
                            </p>
                        )}
                    </div>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setDemoOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={createDemo}
                        disabled={
                            !demoVariant ||
                            demoDescription.trim().length < 10
                        }
                    >
                        Create Demo Request
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default Replacements;
