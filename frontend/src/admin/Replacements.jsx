
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

import { demoOrders } from "../data/orderPreview";
import { productCatalog } from "../data/productCatalog";

// ================== REPLACEMENT CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_replacements";
const ORDER_KEY = "zupito_admin_orders";
const PRODUCT_KEY = "zupito_admin_products";
const CATEGORY_KEY = "zupito_admin_categories";
const TASK_KEY = "zupito_admin_delivery_assignments";
const AGENT_KEY = "zupito_admin_delivery_agents";

const initialRequests = [
    {
        id: "ZR1001",
        orderId: "ZUP-20261102-1002",
        productId: "preview-shirt",
        variantId: "shirt-navy-m",
        productName: "Men's Casual Shirt - Navy, M",
        category: "mens-wear",
        seller: "Urban Fashion",
        customerName: "Demo Customer",
        customerPincode: "751001",
        sellerPincode: "751007",
        quantity: 1,
        reason: "Wrong item received",
        description: "Received a different size from the ordered item.",
        deliveredAt: "2026-11-03",
        requestedAt: "2026-11-05T11:20:00+05:30",
        sellerDecision: "Confirmed",
        sellerNote: "Matching replacement item is available.",
        status: "Pending",
    },
    {
        id: "ZR1002",
        orderId: "ZUP-20261024-1005",
        productId: "preview-backpack",
        variantId: null,
        productName: "Travel Backpack",
        category: "backpacks",
        seller: "TravelMate Store",
        customerName: "Demo Customer",
        customerPincode: "751001",
        sellerPincode: "751013",
        quantity: 1,
        reason: "Damaged item",
        description: "The bag arrived with a damaged zipper.",
        deliveredAt: "2026-10-27",
        requestedAt: "2026-10-29T10:10:00+05:30",
        sellerDecision: "Awaiting",
        sellerNote: "",
        status: "Pending",
    },
    {
        id: "ZR1003",
        orderId: "ZUP-20261015-1007",
        productId: "preview-dress",
        variantId: null,
        productName: "Women's Everyday Dress",
        category: "womens-wear",
        seller: "Urban Fashion",
        customerName: "Demo Customer",
        customerPincode: "751001",
        sellerPincode: "751007",
        quantity: 1,
        reason: "Defective or not working",
        description: "The garment was received with damaged stitching.",
        deliveredAt: "2026-10-18",
        requestedAt: "2026-10-20T12:15:00+05:30",
        sellerDecision: "Declined",
        sellerNote: "Seller could not confirm an identical replacement.",
        status: "Rejected",
        adminNote: "Identical replacement stock was not confirmed.",
        reviewedAt: "2026-10-21T10:30:00+05:30",
    },
    {
        id: "ZR1004",
        orderId: "DEMO-REP-2004",
        productId: "preview-headphones",
        variantId: null,
        productName: "Over-Ear Wireless Headphones",
        category: "headphones",
        seller: "TechNova Electronics",
        customerName: "Preview Customer",
        customerPincode: "751001",
        sellerPincode: "751007",
        quantity: 1,
        reason: "Defective or not working",
        description: "Audio output was intermittent.",
        deliveredAt: "2026-10-22",
        requestedAt: "2026-10-23T14:20:00+05:30",
        sellerDecision: "Confirmed",
        sellerNote: "Replacement unit confirmed.",
        status: "Inspection",
        stockReserved: true,
        pickupTaskId: "HIST-RPU-2004",
        reviewedAt: "2026-10-24T09:40:00+05:30",
    },
    {
        id: "ZR1005",
        orderId: "DEMO-REP-2005",
        productId: "preview-trolley",
        variantId: null,
        productName: "Travel Trolley Bag",
        category: "trolley-bags",
        seller: "TravelMate Store",
        customerName: "Preview Customer",
        customerPincode: "751024",
        sellerPincode: "751013",
        quantity: 1,
        reason: "Wrong item received",
        description: "The original delivered bag was not the ordered model.",
        deliveredAt: "2026-10-12",
        requestedAt: "2026-10-13T11:00:00+05:30",
        sellerDecision: "Confirmed",
        sellerNote: "Inspection completed and replacement dispatched.",
        status: "Completed",
        stockReserved: true,
        pickupTaskId: "HIST-RPU-2005",
        deliveryTaskId: "HIST-RDL-2005",
        reviewedAt: "2026-10-14T10:00:00+05:30",
        completedAt: "2026-10-19T17:30:00+05:30",
    },
];

const statusOptions = [
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

// ================== HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function loadRequests() {
    return readList(STORAGE_KEY) || initialRequests;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function formatDay(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getRequestWindow(request, categories) {
    const category = categories.find((item) => item.slug === request.category);

    if (categories.length && !category) {
        return { days: 0, issue: "Product category is unavailable." };
    }

    if (category) {
        const parent = categories.find((item) => item.slug === category.parentId);

        if (
            category.status !== "Active" ||
            (category.parentId && (!parent || parent.status !== "Active"))
        ) {
            return { days: 0, issue: "Replacement category is disabled." };
        }

        if (category.replacementAllowed !== true) {
            return { days: 0, issue: "This category is not replacement eligible." };
        }

        return { days: Number(category.replacementDays) || 7, issue: null };
    }

    return { days: 7, issue: null };
}

function getInventory(request, products) {
    const product = products.find((item) =>
        String(item.id || item._id) === request.productId
    );

    if (!product) {
        return { stock: null, issue: "Product inventory is unavailable." };
    }

    const variants = product.variants || [];
    const variant = request.variantId
        ? variants.find((item) => item.id === request.variantId)
        : null;

    if (request.variantId && variants.length && !variant) {
        return { stock: null, issue: "Original purchased variant is unavailable." };
    }

    const stock = Number(variant ? variant.stock : product.stock);

    if (!Number.isFinite(stock) || stock < request.quantity) {
        return { stock, issue: "Insufficient replacement stock." };
    }

    return { stock, issue: null };
}

function checkEligibility(request, categories, products, orders) {
    if (request.status !== "Pending") {
        return "Only pending requests can be approved.";
    }

    if (request.sellerDecision !== "Confirmed") {
        return request.sellerDecision === "Declined"
            ? "Seller has declined the replacement."
            : "Waiting for seller confirmation.";
    }

    const order = orders.find((item) =>
        String(item.id || item._id) === request.orderId
    );

    if (!order || String(order.orderStatus).toLowerCase() !== "delivered") {
        return "A verified delivered order is required.";
    }

    const { days, issue } = getRequestWindow(request, categories);

    if (issue) return issue;

    const delivered = new Date(request.deliveredAt);
    const requested = new Date(request.requestedAt);

    if (
        Number.isNaN(delivered.getTime()) ||
        Number.isNaN(requested.getTime())
    ) {
        return "Delivery or request date is invalid.";
    }

    const elapsedDays = Math.ceil(
        (requested.getTime() - delivered.getTime()) / 86400000
    );

    if (elapsedDays < 0 || elapsedDays > days) {
        return `Request was not submitted within the ${days}-day replacement window.`;
    }

    if (!request.customerPincode || !request.sellerPincode) {
        return "Pickup and seller destination pincodes are required.";
    }

    return getInventory(request, products).issue;
}

function assignAgent(task, agents) {
    const nextAgents = agents.map((agent) => ({ ...agent }));

    const candidate = nextAgents
        .filter((agent) => {
            const pins = Array.isArray(agent.pincodes) ? agent.pincodes : [];

            return agent.status === "Active" &&
                agent.availability === "Available" &&
                Number(agent.activeTasks) < Number(agent.capacity) &&
                pins.includes(task.pickupPincode) &&
                pins.includes(task.deliveryPincode);
        })
        .sort((a, b) =>
            Number(a.activeTasks) - Number(b.activeTasks) ||
            a.id.localeCompare(b.id)
        )[0];

    if (!candidate) return { task, agents: nextAgents };

    candidate.activeTasks = Number(candidate.activeTasks) + 1;

    const now = new Date().toISOString();

    return {
        task: {
            ...task,
            agentId: candidate.id,
            stage: "assigned",
            assignmentMode: "Auto",
            assignedAt: now,
            events: [
                ...(task.events || []),
                {
                    date: now,
                    note: `Automatically assigned to ${candidate.name}.`,
                },
            ],
        },
        agents: nextAgents,
    };
}

function StatusBadge({ value }) {
    const theme = value === "Completed" ? "success"
        : value === "Rejected" ? "danger"
        : value === "Pending" ? "warning"
        : "blue";

    return (
        <span className={`repl-badge repl-badge--${theme}`}>
            <span className="repl-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="repl-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== REPLACEMENT MANAGEMENT ==================
function Replacements() {
    const [requests, setRequests] = useState(loadRequests);
    const [categories, setCategories] = useState(() => readList(CATEGORY_KEY) || []);
    const [products, setProducts] = useState(() => readList(PRODUCT_KEY) || productCatalog);
    const [orders, setOrders] = useState(() => readList(ORDER_KEY) || demoOrders);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sellerFilter, setSellerFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTION ==================
    const [selectedId, setSelectedId] = useState(null);
    const [action, setAction] = useState(null);
    const [adminNote, setAdminNote] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedRequest = requests.find((item) => item.id === selectedId);
    const actionRequest = requests.find((item) => item.id === action?.id);

    // ================== PERSIST REQUESTS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
        } catch {
            // Continue using React state.
        }
    }, [requests]);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Requests",
            value: requests.length,
            description: "Replacement request records",
            theme: "blue",
            icon: "fa-rotate",
        },
        {
            label: "Pending Approval",
            value: requests.filter((item) => item.status === "Pending").length,
            description: "Awaiting review or seller input",
            theme: "orange",
            icon: "fa-clock",
        },
        {
            label: "In Progress",
            value: requests.filter((item) =>
                !["Pending", "Rejected", "Completed"].includes(item.status)
            ).length,
            description: "Pickup, inspection or delivery",
            theme: "green",
            icon: "fa-truck-fast",
        },
        {
            label: "Rejected Requests",
            value: requests.filter((item) => item.status === "Rejected").length,
            description: "Requests not approved",
            theme: "red",
            icon: "fa-circle-xmark",
        },
    ];

    const sellers = [...new Set(requests.map((item) => item.seller))].sort();

    // ================== FILTER RESULTS ==================
    const filteredRequests = requests.filter((item) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            item.id,
            item.orderId,
            item.productName,
            item.seller,
            item.customerName,
            item.category,
        ].some((value) => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (statusFilter === "All" || item.status === statusFilter) &&
            (sellerFilter === "All" || item.seller === sellerFilter);
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    const visibleRequests = filteredRequests.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        sellerFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setSellerFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setRequests(loadRequests());
        setCategories(readList(CATEGORY_KEY) || []);
        setProducts(readList(PRODUCT_KEY) || productCatalog);
        setOrders(readList(ORDER_KEY) || demoOrders);
        setPage(0);
        toast.info("Replacement requests refreshed.");
    };

    // ================== REVIEW ACTIONS ==================
    const openAction = (request, type) => {
        setSelectedId(null);
        setAction({ id: request.id, type });
        setAdminNote("");
        setActionError("");
    };

    const closeAction = () => {
        setAction(null);
        setAdminNote("");
        setActionError("");
    };

    const handleConfirm = () => {
        if (!actionRequest || actionRequest.status !== "Pending") {
            setActionError("This request is no longer pending.");
            return;
        }

        const note = adminNote.trim();

        if (action.type === "reject" && (note.length < 5 || note.length > 300)) {
            setActionError("Enter a rejection reason containing 5–300 characters.");
            return;
        }

        const now = new Date().toISOString();

        if (action.type === "approve") {
            const issue = checkEligibility(
                actionRequest,
                categories,
                products,
                orders
            );

            if (issue) {
                setActionError(issue);
                return;
            }

            // Create the reverse pickup task after the demo stock check.
            const taskId = `REP-PICKUP-${actionRequest.id}`;
            const existingTasks = readList(TASK_KEY) || [];

            if (existingTasks.some((task) => task.id === taskId)) {
                setActionError("A pickup task already exists for this request.");
                return;
            }

            const pickupTask = {
                id: taskId,
                orderId: actionRequest.orderId,
                parcelId: `RPU-${actionRequest.id}`,
                replacementId: actionRequest.id,
                kind: "replacement_pickup",
                source: "Replacement",
                product: actionRequest.productName,
                seller: actionRequest.seller,
                pickupPincode: actionRequest.customerPincode,
                deliveryPincode: actionRequest.sellerPincode,
                stage: "ready_for_pickup",
                agentId: null,
                custody: "Customer",
                assignmentMode: null,
                attempts: 0,
                events: [],
                createdAt: now,
            };

            const result = assignAgent(
                pickupTask,
                readList(AGENT_KEY) || []
            );

            try {
                localStorage.setItem(
                    TASK_KEY,
                    JSON.stringify([...existingTasks, result.task])
                );

                if (result.agents.length) {
                    localStorage.setItem(
                        AGENT_KEY,
                        JSON.stringify(result.agents)
                    );
                }
            } catch {
                setActionError("Unable to save the pickup assignment.");
                return;
            }

            setRequests((previous) => previous.map((request) =>
                request.id === actionRequest.id
                    ? {
                          ...request,
                          status: result.task.agentId ? "Pickup Assigned" : "Approved",
                          stockReserved: true,
                          pickupTaskId: taskId,
                          reviewedAt: now,
                          adminNote: note,
                          history: [
                              ...(request.history || []),
                              {
                                  status: "Approved",
                                  date: now,
                                  note: "Approved with demo stock reservation.",
                              },
                              {
                                  status: result.task.agentId
                                      ? "Pickup Assigned"
                                      : "Pickup Awaiting Agent",
                                  date: now,
                                  note: result.task.agentId
                                      ? `Assigned to agent ${result.task.agentId}.`
                                      : "Pickup task created without an eligible agent.",
                              },
                          ],
                      }
                    : request
            ));

            toast.success(
                result.task.agentId
                    ? "Replacement approved and reverse pickup assigned."
                    : "Replacement approved. Pickup task is awaiting an agent."
            );
        } else {
            setRequests((previous) => previous.map((request) =>
                request.id === actionRequest.id
                    ? {
                          ...request,
                          status: "Rejected",
                          adminNote: note,
                          reviewedAt: now,
                          history: [
                              ...(request.history || []),
                              { status: "Rejected", note, date: now },
                          ],
                      }
                    : request
            ));

            toast.success("Replacement request rejected.");
        }

        setPage(0);
        closeAction();
    };

    return (
        <div className="manage-replacements">
            {/* ================== PAGE HEADER ================== */}
            <section className="repl-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-rotate" aria-hidden="true" />
                        REPLACEMENT MANAGEMENT
                    </span>

                    <p>
                        Review product replacement requests, seller confirmations,
                        pickup progress and replacement deliveries.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="repl-refresh"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="repl-stats">
                {statistics.map((item) => (
                    <article
                        key={item.label}
                        className={`repl-stat repl-stat--${item.theme}`}
                    >
                        <div className="repl-stat-heading">
                            <span>{item.label}</span>

                            <span className="repl-stat-icon">
                                <i className={`fa-solid ${item.icon}`} />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== REQUEST LIST ================== */}
            <section className="repl-card">
                <div className="repl-section-header">
                    <div className="repl-section-heading">
                        <span className="repl-section-icon">
                            <i className="fa-solid fa-clipboard-check" />
                        </span>

                        <div>
                            <h2>Replacement Requests</h2>
                            <p>
                                Monitor eligibility, approval decisions
                                and reverse pickup status.
                            </p>
                        </div>
                    </div>

                    <span className="repl-record-count">
                        {filteredRequests.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="repl-toolbar">
                    <div className="repl-search">
                        <TextField
                            label="Search Replacements"
                            placeholder="Request ID, order, product, customer or seller"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(0);
                            }}
                            size="small"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <i className="fa-solid fa-magnifying-glass" />
                                        </InputAdornment>
                                    ),
                                    htmlInput: { maxLength: 100 },
                                },
                            }}
                            fullWidth
                        />
                    </div>

                    <TextField
                        select
                        label="Request Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="repl-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>

                        {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Seller"
                        value={sellerFilter}
                        onChange={(event) => {
                            setSellerFilter(event.target.value);
                            setPage(0);
                        }}
                        className="repl-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Sellers</MenuItem>

                        {sellers.map((seller) => (
                            <MenuItem key={seller} value={seller}>
                                {seller}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="repl-reset"
                        disabled={!hasFilters}
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== REQUESTS TABLE ================== */}
                <TableContainer className="repl-table-scroll">
                    <Table className="repl-table" aria-label="Replacement requests">
                        <TableHead>
                            <TableRow>
                                <TableCell>Request / Order</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Customer / Seller</TableCell>
                                <TableCell>Requested On</TableCell>
                                <TableCell>Seller Response</TableCell>
                                <TableCell>Request Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleRequests.map((request) => (
                                <TableRow key={request.id} hover>
                                    <TableCell>
                                        <div className="repl-cell">
                                            <strong className="repl-code">{request.id}</strong>
                                            <small>{request.orderId}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="repl-cell repl-product">
                                            <strong>{request.productName}</strong>
                                            <small>
                                                {request.quantity} unit(s) · {request.reason}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="repl-cell">
                                            <strong>{request.customerName}</strong>
                                            <small>{request.seller}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="repl-date">
                                            {formatDate(request.requestedAt)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <span className={`repl-seller-response is-${request.sellerDecision.toLowerCase()}`}>
                                            {request.sellerDecision}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge value={request.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            className="repl-view-button"
                                            onClick={() => setSelectedId(request.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleRequests.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="repl-empty">
                                            <i className="fa-solid fa-rotate" />
                                            <h3>No Replacement Requests</h3>
                                            <p>Try adjusting your search or filters.</p>

                                            {hasFilters && (
                                                <Button
                                                    variant="outlined"
                                                    onClick={resetFilters}
                                                >
                                                    Clear Filters
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
                    className="repl-pagination"
                    count={filteredRequests.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== REQUEST DETAILS ================== */}
            <Dialog
                open={Boolean(selectedRequest)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "repl-dialog" } }}
            >
                {selectedRequest && (
                    <>
                        <DialogTitle>Replacement Request Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="repl-detail-banner">
                                <div>
                                    <strong>{selectedRequest.id}</strong>
                                    <p>{selectedRequest.orderId}</p>
                                </div>

                                <StatusBadge value={selectedRequest.status} />
                            </div>

                            <div className="repl-detail-section">
                                <h4>Product & Customer</h4>

                                <dl className="repl-detail-grid">
                                    <DetailItem
                                        label="Product"
                                        value={selectedRequest.productName}
                                    />
                                    <DetailItem
                                        label="Quantity"
                                        value={selectedRequest.quantity}
                                    />
                                    <DetailItem
                                        label="Customer"
                                        value={selectedRequest.customerName}
                                    />
                                    <DetailItem
                                        label="Seller"
                                        value={selectedRequest.seller}
                                    />
                                    <DetailItem
                                        label="Delivered On"
                                        value={formatDay(selectedRequest.deliveredAt)}
                                    />
                                    <DetailItem
                                        label="Requested On"
                                        value={formatDate(selectedRequest.requestedAt)}
                                    />
                                    <DetailItem
                                        label="Pickup Pincode"
                                        value={selectedRequest.customerPincode}
                                    />
                                    <DetailItem
                                        label="Seller Pincode"
                                        value={selectedRequest.sellerPincode}
                                    />
                                </dl>
                            </div>

                            <div className="repl-detail-section">
                                <h4>Replacement Reason</h4>

                                <div className="repl-note">
                                    <strong>{selectedRequest.reason}</strong>
                                    <p>{selectedRequest.description || "No additional details."}</p>
                                </div>
                            </div>

                            <div className="repl-detail-section">
                                <h4>Seller Confirmation & Stock</h4>

                                <dl className="repl-detail-grid">
                                    <DetailItem
                                        label="Seller Response"
                                        value={selectedRequest.sellerDecision}
                                    />
                                    <DetailItem
                                        label="Replacement Window"
                                        value={`${getRequestWindow(selectedRequest, categories).days} days`}
                                    />
                                    <DetailItem
                                        label="Preview Available Stock"
                                        value={getInventory(selectedRequest, products).stock ?? "Unavailable"}
                                    />
                                    <DetailItem
                                        label="Stock Reservation"
                                        value={selectedRequest.stockReserved
                                            ? "Recorded (Demo)"
                                            : "Not Reserved"}
                                    />
                                </dl>

                                {selectedRequest.sellerNote && (
                                    <p className="repl-seller-note">
                                        <strong>Seller Note:</strong> {selectedRequest.sellerNote}
                                    </p>
                                )}
                            </div>

                            {selectedRequest.status === "Pending" && (
                                <Alert
                                    severity={checkEligibility(
                                        selectedRequest, categories, products, orders
                                    ) ? "warning" : "success"}
                                    className="repl-alert"
                                >
                                    {checkEligibility(
                                        selectedRequest, categories, products, orders
                                    ) || "Seller, category window and preview stock checks passed."}
                                </Alert>
                            )}

                            {(selectedRequest.pickupTaskId ||
                                selectedRequest.deliveryTaskId) && (
                                <div className="repl-detail-section">
                                    <h4>Pickup & Replacement Delivery</h4>

                                    <dl className="repl-detail-grid">
                                        <DetailItem
                                            label="Reverse Pickup Task"
                                            value={selectedRequest.pickupTaskId || "Not Created"}
                                        />
                                        <DetailItem
                                            label="Replacement Delivery Task"
                                            value={selectedRequest.deliveryTaskId || "Awaiting Seller Inspection"}
                                        />
                                    </dl>
                                </div>
                            )}

                            {selectedRequest.adminNote && (
                                <Alert severity="info" className="repl-alert">
                                    <strong>Admin Note:</strong> {selectedRequest.adminNote}
                                </Alert>
                            )}

                            {(selectedRequest.history || []).length > 0 && (
                                <div className="repl-detail-section">
                                    <h4>Request History</h4>

                                    <div className="repl-history">
                                        {selectedRequest.history.map((event, index) => (
                                            <div key={index}>
                                                <strong>{event.status}</strong>
                                                <small>{formatDate(event.date)}</small>
                                                <p>{event.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Alert severity="info" className="repl-alert">
                                Replacement is for the same product and variant.
                                No cash refund is issued for replacement requests.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="repl-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedRequest.status === "Pending" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => openAction(selectedRequest, "reject")}
                                    >
                                        Reject
                                    </Button>

                                    <Button
                                        variant="contained"
                                        onClick={() => openAction(selectedRequest, "approve")}
                                        disabled={Boolean(checkEligibility(
                                            selectedRequest, categories, products, orders
                                        ))}
                                    >
                                        Approve
                                    </Button>
                                </>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== REVIEW CONFIRMATION ================== */}
            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "repl-dialog" } }}
            >
                <DialogTitle>
                    {action?.type === "approve"
                        ? "Approve Replacement"
                        : "Reject Replacement"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="repl-confirm-text">
                        Request: <strong>{actionRequest?.id}</strong>
                    </p>

                    {action?.type === "approve" && (
                        <Alert severity="info" className="repl-alert">
                            This records a demo stock reservation and creates a
                            reverse pickup task. A replacement delivery task is
                            created only after seller inspection approval and
                            Ready for Pickup.
                        </Alert>
                    )}

                    <TextField
                        label={action?.type === "reject"
                            ? "Rejection Reason"
                            : "Admin Note (Optional)"}
                        value={adminNote}
                        onChange={(event) => {
                            setAdminNote(event.target.value);
                            setActionError("");
                        }}
                        multiline
                        minRows={3}
                        fullWidth
                        error={Boolean(actionError)}
                        helperText={actionError || (
                            action?.type === "reject"
                                ? "Enter at least 5 characters."
                                : "Add an optional internal note."
                        )}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                    />

                    {actionError && (
                        <Alert severity="error" className="repl-alert">
                            {actionError}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions className="repl-dialog-actions">
                    <Button color="inherit" onClick={closeAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={action?.type === "reject" ? "error" : "primary"}
                        onClick={handleConfirm}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Replacements;
