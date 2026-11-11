import { useEffect, useState } from "react";
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
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
import api from "../services/api";

const statuses = [
    "Requested",
    "Approved",
    "Return In Transit",
    "Awaiting Inspection",
    "Inspection Failed",
    "Inspection Passed",
    "Ready for Pickup",
    "Replacement Shipped",
    "Completed",
    "Rejected",
];
const date = (value) => (value ? new Date(value).toLocaleString("en-IN") : "—");

// Both roles use the same records; the server owns permissions and transitions.
export default function ReplacementManagement({ seller = false, replacementId = "" }) {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [selected, setSelected] = useState(null);
    const [action, setAction] = useState("");
    const [note, setNote] = useState("");
    const [restock, setRestock] = useState(false);
    const [busy, setBusy] = useState(false);
    const [code, setCode] = useState(null);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const refresh = async () => {
        try {
            const { data } = await api.get("/replacements");
            setRows(data.replacements);
        } catch (error) {
            toast.error(error.message);
        }
    };
    useEffect(() => {
        void refresh();
    }, []);
    useEffect(() => {
        if (!replacementId || !rows.length) return;
        const record = rows.find((row) => row.id === replacementId);
        if (record) setSelected(record);
    }, [replacementId, rows]);
    const filtered = rows.filter(
        (row) =>
            (status === "All" || row.status === status) &&
            [row.id, row.orderId, row.item.name, row.item.variantLabel, row.address.name].some(
                (value) =>
                    String(value || "")
                        .toLowerCase()
                        .includes(search.toLowerCase())
            )
    );
    const actions = !selected
        ? []
        : seller
          ? selected.status === "Awaiting Inspection"
              ? [
                    ["inspect_pass", "Inspection Passed"],
                    ["inspect_fail", "Inspection Failed"],
                ]
              : selected.status === "Inspection Passed"
                ? [["ready", "Ready for Pickup"]]
                : []
          : selected.status === "Requested"
            ? [
                  ["approve", "Approve & Reserve Stock"],
                  ["reject", "Reject"],
              ]
            : selected.status === "Inspection Failed"
              ? [["reopen", "Reopen Inspection"]]
              : [];
    const save = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await api.patch(`/replacements/${selected.id}`, { action, note, restock });
            toast.success("Replacement updated.");
            setSelected(null);
            await refresh();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };
    const readCode = async () => {
        try {
            const { data } = await api.get(`/replacements/${selected.id}/code`);
            setCode(data);
        } catch (error) {
            toast.error(error.message);
        }
    };
    return (
        <div className="manage-replacements">
            <section className="repl-hero">
                <div>
                    <span className="zs-eyebrow">
                        {seller ? "Store Replacements" : "Replacement Management"}
                    </span>
                    <p>Track requests, verified returns, inspections and replacement deliveries.</p>
                </div>
                <Button variant="outlined" onClick={refresh}>
                    Refresh
                </Button>
            </section>
            <section className="repl-stats">
                {[
                    ["Total Requests", rows.length, "blue"],
                    [
                        "Awaiting Review",
                        rows.filter((r) => r.status === "Requested").length,
                        "orange",
                    ],
                    ["Completed", rows.filter((r) => r.status === "Completed").length, "green"],
                    [
                        "Inspection Exceptions",
                        rows.filter((r) => r.status === "Inspection Failed").length,
                        "red",
                    ],
                ].map(([label, value, theme]) => (
                    <article key={label} className={`repl-stat repl-stat--${theme}`}>
                        <div className="repl-stat-heading">
                            <span>{label}</span>
                        </div>
                        <strong>{value}</strong>
                    </article>
                ))}
            </section>
            <section className="repl-card">
                <div className="repl-section-header">
                    <h2>Replacement Requests</h2>
                    <span>{filtered.length} records</span>
                </div>
                <div className="repl-toolbar">
                    <TextField
                        size="small"
                        label="Search requests"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Status"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", ...statuses].map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>
                </div>
                <TableContainer className="repl-table-scroll">
                    <Table className="repl-table">
                        <TableHead>
                            <TableRow>
                                {[
                                    "Product / Variant",
                                    "Order",
                                    "Quantity",
                                    "Requested",
                                    "Status",
                                    "Action",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.slice(page * limit, page * limit + limit).map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="repl-cell">
                                            {row.item.image && (
                                                <img
                                                    src={row.item.image}
                                                    alt=""
                                                    width="48"
                                                    height="48"
                                                    className="panel-item-thumbnail"
                                                />
                                            )}
                                            <div>
                                                <strong>{row.item.name}</strong>
                                                <p>{row.item.variantLabel}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{row.orderId}</TableCell>
                                    <TableCell>{row.quantity}</TableCell>
                                    <TableCell>{date(row.createdAt)}</TableCell>
                                    <TableCell>{row.status}</TableCell>
                                    <TableCell>
                                        <Button
                                            onClick={() => {
                                                setSelected(row);
                                                setAction("");
                                                setNote("");
                                                setRestock(false);
                                                setCode(null);
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!filtered.length && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        No replacement requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    rowsPerPage={limit}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(0);
                    }}
                />
            </section>
            <Dialog
                open={Boolean(selected)}
                onClose={() => !busy && setSelected(null)}
                fullWidth
                maxWidth="sm"
                className="repl-dialog panel-record-dialog"
            >
                <DialogTitle>Replacement Details</DialogTitle>
                <DialogContent dividers>
                    {selected && (
                        <>
                            <div className="panel-record-banner">
                                {selected.item.image && (
                                    <img
                                        className="panel-item-thumbnail"
                                        src={selected.item.image}
                                        alt=""
                                        width="64"
                                        height="64"
                                    />
                                )}
                                <h3>{selected.item.name}</h3>
                            </div>
                            <p>
                                {selected.item.variantLabel} · Quantity: {selected.quantity}
                            </p>
                            <p>
                                <strong>Status:</strong> {selected.status}
                            </p>
                            <p>
                                <strong>Reason:</strong> {selected.reason}
                            </p>
                            <p>{selected.description}</p>
                            <p>
                                <strong>Delivery address:</strong>{" "}
                                {[
                                    selected.address.name,
                                    selected.address.house,
                                    selected.address.area,
                                    selected.address.city,
                                    selected.address.pincode,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                            <p>
                                Requested: {date(selected.createdAt)} · Window ended:{" "}
                                {date(selected.deadline)}
                            </p>
                            {(selected.images || []).map((image) => (
                                <a
                                    href={image.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={image.url}
                                >
                                    <img
                                        src={image.url}
                                        alt="Reported product issue"
                                        width="90"
                                        height="90"
                                        className="panel-item-thumbnail"
                                    />
                                </a>
                            ))}
                            <h4>History</h4>
                            {(selected.history || []).map((entry, index) => (
                                <p key={index}>
                                    <strong>{entry.status}</strong> — {entry.note}
                                    <br />
                                    <small>{date(entry.date)}</small>
                                </p>
                            ))}
                            {seller && (
                                <>
                                    <Button onClick={readCode}>View My Handover OTP</Button>
                                    {code && (
                                        <p role="status">
                                            <strong>{code.otp}</strong> · Expires{" "}
                                            {date(code.expiresAt)}. Share only when the parcel is
                                            handed over.
                                        </p>
                                    )}
                                </>
                            )}
                            {actions.length > 0 && (
                                <>
                                    <TextField
                                        select
                                        fullWidth
                                        margin="normal"
                                        label="Action"
                                        value={action}
                                        onChange={(e) => setAction(e.target.value)}
                                    >
                                        {actions.map(([value, label]) => (
                                            <MenuItem key={value} value={value}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        label="Decision / Inspection Note"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        slotProps={{ htmlInput: { maxLength: 300 } }}
                                    />
                                    {action === "inspect_pass" && (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={restock}
                                                    onChange={(e) => setRestock(e.target.checked)}
                                                />
                                            }
                                            label="Returned item is suitable for resale; add it to stock"
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setSelected(null)}>
                        Close
                    </Button>
                    {action && (
                        <Button
                            variant="contained"
                            disabled={busy || note.trim().length < 5}
                            onClick={save}
                        >
                            {busy ? "Saving…" : "Confirm"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </div>
    );
}
