import { useEffect, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../services/api";
const money = (paise) =>
    (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export default function Settlements({ seller = false }) {
    const [data, setData] = useState({ settlements: [], earnings: [] });
    const [selected, setSelected] = useState(null);
    const [reference, setReference] = useState("");
    const [paidAt, setPaidAt] = useState("");
    const [amount, setAmount] = useState("");
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState("");
    const refresh = async () => {
        try {
            const result = await api.get("/settlements");
            setData(result.data);
        } catch (error) {
            toast.error(error.message);
        }
    };
    useEffect(() => {
        void refresh();
    }, []);
    const confirm = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await api.post(`/settlements/${selected.id}/confirm`, {
                reference,
                amount: Number(amount),
                paidAt: new Date(paidAt).toISOString(),
            });
            setSelected(null);
            toast.success("Settlement confirmation recorded.");
            await refresh();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };
    const rows = data.settlements.filter((row) =>
        [row.orderId, row.seller, row.reference, row.batch].some((value) =>
            String(value).toLowerCase().includes(search.toLowerCase())
        )
    );
    return (
        <div className="manage-settlements">
            <section className="st-hero">
                <div>
                    <span className="zs-eyebrow">
                        {seller ? "Your Earnings" : "Commission & Settlements"}
                    </span>
                    <p>Sales allocations, adjustments and confirmed settlement statements.</p>
                </div>
                <Button variant="outlined" onClick={refresh}>
                    Refresh
                </Button>
            </section>
            <section className="st-stats">
                {[
                    [
                        "Net Earnings",
                        data.earnings.reduce((sum, row) => sum + Math.round(row.payable * 100), 0),
                        "blue",
                    ],
                    [
                        "Commission",
                        data.earnings.reduce(
                            (sum, row) => sum + Math.round(row.commission * 100),
                            0
                        ),
                        "orange",
                    ],
                    [
                        "Prepared",
                        data.settlements
                            .filter((row) => row.status === "Pending")
                            .reduce((sum, row) => sum + row.payablePaise, 0),
                        "green",
                    ],
                    [
                        "Settled",
                        data.settlements
                            .filter((row) => row.status === "Paid")
                            .reduce((sum, row) => sum + row.payablePaise, 0),
                        "blue",
                    ],
                ].map(([label, value, theme]) => (
                    <article className={`st-stat st-stat--${theme}`} key={label}>
                        <div className="st-stat-heading">
                            <span>{label}</span>
                        </div>
                        <strong>{money(value)}</strong>
                    </article>
                ))}
            </section>
            <section className="st-card">
                <div className="st-section-header">
                    <h2>Settlement Statements</h2>
                    <TextField
                        size="small"
                        label="Search statements"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <p className="st-earnings">
                    Statements are prepared after a 31-day delivery hold, excluding unresolved
                    replacements and complaints. Shipping is retained by the platform. Confirmation
                    records an external transfer; it does not initiate a bank payout.
                </p>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {[
                                    "Batch / Seller",
                                    "Order",
                                    "Net Sales",
                                    "Commission",
                                    "Payable",
                                    "Status / Reference",
                                    "Action",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        {row.batch}
                                        <br />
                                        {row.seller}
                                    </TableCell>
                                    <TableCell>{row.orderId}</TableCell>
                                    <TableCell>
                                        {money(row.grossPaise - row.discountPaise)}
                                    </TableCell>
                                    <TableCell>{money(row.commissionPaise)}</TableCell>
                                    <TableCell>{money(row.payablePaise)}</TableCell>
                                    <TableCell>
                                        {row.status}
                                        <br />
                                        {row.reference || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {!seller && row.status === "Pending" ? (
                                            <Button
                                                onClick={() => {
                                                    setSelected(row);
                                                    setAmount(String(row.payablePaise / 100));
                                                    setReference("");
                                                    setPaidAt("");
                                                }}
                                            >
                                                Confirm Transfer
                                            </Button>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        No settlement statements available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </section>
            <section className="st-card">
                <div className="st-section-header">
                    <h2>Parcel Earnings</h2>
                </div>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {[
                                    "Order",
                                    "Status",
                                    "Gross Sales",
                                    "Coupon",
                                    "Cancellation Adjustment",
                                    "Commission",
                                    "Net Earnings",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.earnings.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.orderId}</TableCell>
                                    <TableCell>{row.status}</TableCell>
                                    {[
                                        row.gross,
                                        row.discount,
                                        row.adjustment,
                                        row.commission,
                                        row.payable,
                                    ].map((value, index) => (
                                        <TableCell key={index}>
                                            {money(Math.round(value * 100))}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            {!data.earnings.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        Earnings appear after a paid order is confirmed.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </section>
            <Dialog
                open={Boolean(selected)}
                onClose={() => !busy && setSelected(null)}
                fullWidth
                maxWidth="sm"
                className="st-dialog panel-record-dialog"
            >
                <DialogTitle>Confirm Completed Transfer</DialogTitle>
                <DialogContent dividers>
                    <p>Record the transfer only after checking its external payment reference.</p>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Amount (INR)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Payment Reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Transfer Date"
                        type="datetime-local"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setSelected(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={busy || !paidAt || reference.trim().length < 5}
                        onClick={confirm}
                    >
                        {busy ? "Saving…" : "Confirm Settlement"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
