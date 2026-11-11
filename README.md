
# Zupito — Multi-Vendor E-Commerce Marketplace

Zupito is a full-stack multi-vendor e-commerce application built to manage online shopping, seller operations and parcel delivery in one system. It supports multiple sellers listing products across categories such as electronics, fashion and grocery.

Customers can browse products, maintain a cart, place online orders and track purchases. Sellers manage their store, products, inventory, fulfilment and earnings, while administrators oversee the marketplace. Delivery agents handle parcel pickup and delivery through OTP-based verification.

Built with MongoDB, Express, React and Node.js, Zupito provides a public website, a customer account area and separate admin, seller and delivery agent panels.

**Live Website:** [zupito.onrender.com](https://zupito.onrender.com/)

## About the Project

I built Zupito around the workflow of a multi-vendor marketplace where customers purchase products from different sellers through a single checkout.

For customers, the website provides product discovery, variant selection, guest and saved carts, delivery addresses, online payments and order tracking. A single customer order can contain items from multiple sellers, with each seller responsible for fulfilling its own parcel.

For sellers, the platform supports store approval, product moderation, SKU-level inventory history, order preparation, replacement inspection and earnings management. Admins manage sellers, customers, delivery agents, payments, refunds, settlements, complaints and other marketplace operations.

The application is organized into five areas:

- **Customer Website:** Product browsing, categories, search, cart, checkout, policies and contact support.
- **Customer Account:** Profile, saved addresses, orders, reviews, cancellations, replacements and complaints.
- **Admin Panel:** Seller and product approvals, catalog management, orders, deliveries, payments, refunds, settlements and reports.
- **Seller Panel:** Store management, product listings, inventory, fulfilment, replacements, earnings and reviews.
- **Delivery Agent Panel:** Assigned pickups, OTP verification, active deliveries, failed attempts and delivery history.

Order processing uses online payments only. The current scope does not include Cash on Delivery, a wishlist, warehouse management, live GPS tracking or automated seller bank payouts.

## Features

### Customer Website

- Responsive home page with hero banners, categories and product sections.
- Product search, sorting, filtering and pagination.
- Product details with images, specifications, variants and customer reviews.
- Guest cart saved in the browser and merged into the customer cart after sign-in.
- Cart quantity updates, stock availability and checkout summaries.
- Saved delivery addresses, coupon application and online Razorpay checkout.
- Payment result screens, order confirmation, About, Contact and Shopping Policies.

### Customer Account

- Signup, login and logout with email/phone credentials.
- Email OTP-based password recovery.
- Profile picture management and saved delivery addresses.
- My Orders, seller-wise parcel tracking and PDF invoice download.
- Delivery OTP visible to the owning customer for eligible parcels.
- Eligible pre-pickup cancellations and refund-status tracking.
- Same-product/variant replacement requests and status history.
- Verified-purchase ratings, reviews and order-related complaints.

### Admin Panel

- Dashboard with marketplace performance and pending actions.
- Seller application review, approval, rejection and suspension.
- Customer and delivery agent account management.
- Parent/subcategory management and replacement policies.
- Individual and bulk product listing moderation.
- Customer order monitoring and delivery assignment overrides.
- Payment records, refunds, replacements and settlement management.
- Coupons, customer reviews, complaints and reports.

### Seller Panel

- Seller registration and application approval status.
- Store profile, contact information, logo and pickup address.
- Product creation, editing, variant/SKU management and approval tracking.
- Inventory adjustments, CSV imports, low-stock visibility and stock movement history.
- Seller-specific paid order queue, packing and Ready for Pickup workflow.
- Seller pickup OTP for authorized parcel handover to an assigned agent.
- Returned-item inspection and replacement preparation.
- Sales, commission, settlement history and customer reviews.

### Delivery Agent Panel

- Mobile-focused dashboard and availability settings.
- Assigned original deliveries and replacement pickup/delivery tasks.
- Seller pickup OTP entry and verification before parcel custody transfer.
- Out for Delivery updates and customer OTP verification.
- Failed-delivery reasons, controlled retries and escalation.
- Delivery history and role-specific profile management.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router |
| User Interface | Material UI, Bootstrap, CSS, Font Awesome |
| API Requests | Axios |
| Notifications | React Toastify |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, HttpOnly cookies, bcrypt, database-backed sessions |
| Validation | Joi |
| File Uploads and Storage | Multer, Cloudinary, file-type |
| Email | Brevo |
| Payments | Razorpay Test Mode |
| CSV Processing | csv-parse |
| PDF Invoices | PDFKit |
| Deployment | Render |

## Application Workflow

1. An approved seller creates a product listing with variants and stock; admin review publishes eligible products.
2. A customer browses products, selects a variant and adds it to the guest or saved cart.
3. The customer signs in or creates an account. Guest cart items are merged into the saved cart where valid.
4. The customer selects a delivery address, applies an eligible coupon and proceeds to online payment.
5. The backend verifies payment, confirms one customer order and creates the seller fulfilment parcels.
6. The seller packs its parcel and marks it Ready for Pickup. A delivery agent is assigned according to serviceability, availability and capacity.
7. The agent verifies the seller pickup OTP, collects the parcel and marks it Out for Delivery.
8. The customer shares the delivery OTP, which the assigned agent verifies to complete delivery.
9. Customers can view their orders, download invoices, submit reviews and use eligible cancellation or replacement workflows.

Each checkout creates one customer order. Orders containing products from different sellers keep separate seller parcels and delivery progress under the same customer-facing order.

Eligible cancellations trigger refund handling and stock/earnings adjustments. Replacement requests follow admin approval, return pickup, seller inspection and a separate replacement delivery. Background workers support payment reconciliation, assignments, retries, refunds, bulk imports and settlement preparation.

## Authentication and Validation

Authentication uses JWTs with a **15-day expiry**, stored in HttpOnly cookies. Database-backed `AuthSession` records track sessions and retain revocation history after logout or password reset.

Backend controls include:

- Role-based authorization for customers, admins, sellers and delivery agents.
- Ownership and assigned-agent checks for private records and actions.
- Password hashing with bcrypt and unique email/mobile constraints.
- Server-side Joi validation and request-size restrictions.
- Rate limiting on authentication, recovery and other protected actions.
- Allowed-origin checks for state-changing requests, CORS and Helmet security headers.
- Server-side Razorpay signature verification, webhook handling and duplicate-event protection.
- Atomic order, inventory and delivery transitions with recorded history.
- Validated image uploads and controlled access to pickup/delivery OTPs.

Password recovery uses a six-digit email OTP with a ten-minute validity, a sixty-second resend cooldown, a limit of five incorrect verification attempts and limits on repeated recovery requests.

## Project Structure

```text
Zupito/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   ├── email.js
│   │   ├── orderRules.js
│   │   └── payment.js
│   ├── controllers/
│   │   ├── addressController.js
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── bulkImportController.js
│   │   ├── cartController.js
│   │   ├── categoryController.js
│   │   ├── checkoutController.js
│   │   ├── complaintController.js
│   │   ├── couponController.js
│   │   ├── deliveryController.js
│   │   ├── orderController.js
│   │   ├── passwordResetController.js
│   │   ├── paymentController.js
│   │   ├── productController.js
│   │   ├── refundController.js
│   │   ├── replacementController.js
│   │   ├── reportController.js
│   │   ├── reviewController.js
│   │   ├── sellerController.js
│   │   ├── settlementController.js
│   │   └── userController.js
│   ├── jobs/
│   │   ├── assignmentWorker.js
│   │   ├── bulkImportWorker.js
│   │   ├── deliveryRetryWorker.js
│   │   ├── paymentReconciliation.js
│   │   ├── refundWorker.js
│   │   └── settlementScheduler.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── csrfMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── rateLimiter.js
│   │   ├── uploadMiddleware.js
│   │   └── validateMiddleware.js
│   ├── models/
│   │   ├── Address.js
│   │   ├── AuditLog.js
│   │   ├── AuthSession.js
│   │   ├── BackgroundJob.js
│   │   ├── BulkImport.js
│   │   ├── Cart.js
│   │   ├── Category.js
│   │   ├── Complaint.js
│   │   ├── Coupon.js
│   │   ├── DeliveryAgentProfile.js
│   │   ├── DeliveryTask.js
│   │   ├── Order.js
│   │   ├── PasswordReset.js
│   │   ├── Payment.js
│   │   ├── Product.js
│   │   ├── Refund.js
│   │   ├── Replacement.js
│   │   ├── Review.js
│   │   ├── SellerOrder.js
│   │   ├── SellerProfile.js
│   │   ├── Settlement.js
│   │   ├── StockMovement.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── checkoutRoutes.js
│   │   ├── complaintRoutes.js
│   │   ├── couponRoutes.js
│   │   ├── deliveryRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── productRoutes.js
│   │   ├── refundRoutes.js
│   │   ├── replacementRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── sellerRoutes.js
│   │   ├── settlementRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── payment/
│   │   │   ├── paymentService.js
│   │   │   └── razorpayProvider.js
│   │   ├── assignmentService.js
│   │   ├── auditService.js
│   │   ├── bulkImportService.js
│   │   ├── checkoutService.js
│   │   ├── deliveryOtpService.js
│   │   ├── deliveryService.js
│   │   ├── inventoryService.js
│   │   ├── invoiceService.js
│   │   ├── jobService.js
│   │   ├── orderService.js
│   │   ├── pricingService.js
│   │   ├── refundService.js
│   │   ├── replacementService.js
│   │   └── settlementService.js
│   ├── utils/
│   │   ├── ExpressError.js
│   │   └── generateToken.js
│   ├── validations/
│   │   └── schema.js
│   ├── app.js
│   ├── package-lock.json
│   ├── package.json
│   ├── seedShowcase.js
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── images/
│   │       ├── about-contact-banner.jpg
│   │       ├── about-story.jpg
│   │       ├── default-avatar.svg
│   │       ├── hero_electronics.webp
│   │       ├── hero_fashion.webp
│   │       ├── hero_grocery.webp
│   │       ├── zupito_favicon.png
│   │       └── zupito_logo.png
│   ├── src/
│   │   ├── admin/
│   │   │   ├── Categories.jsx
│   │   │   ├── Complaints.jsx
│   │   │   ├── Coupons.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DeliveryAgents.jsx
│   │   │   ├── DeliveryAssignments.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Refunds.jsx
│   │   │   ├── Replacements.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Reviews.jsx
│   │   │   ├── Sellers.jsx
│   │   │   └── Settlements.jsx
│   │   ├── auth/
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── SellerRegister.jsx
│   │   │   └── Signup.jsx
│   │   ├── components/
│   │   │   ├── AccessDenied.jsx
│   │   │   ├── AddressForm.jsx
│   │   │   ├── AddressSelector.jsx
│   │   │   ├── DeliveryOTP.jsx
│   │   │   ├── InvoiceDownload.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── OrderCancellation.jsx
│   │   │   ├── OrderItems.jsx
│   │   │   ├── OrderTimeline.jsx
│   │   │   ├── PanelHeader.jsx
│   │   │   ├── PanelSidebar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductSearchBar.jsx
│   │   │   ├── ProfileForm.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ReplacementManagement.jsx
│   │   │   ├── ReviewForm.jsx
│   │   │   ├── SettlementManagement.jsx
│   │   │   ├── WebsiteFooter.jsx
│   │   │   └── WebsiteNavbar.jsx
│   │   ├── config/
│   │   │   ├── appConfig.js
│   │   │   ├── panelConfig.js
│   │   │   └── seoConfig.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── css/
│   │   │   ├── auth.css
│   │   │   ├── global.css
│   │   │   ├── panel.css
│   │   │   └── website.css
│   │   ├── delivery/
│   │   │   ├── AssignedTasks.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DeliveryHistory.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── TaskDetails.jsx
│   │   ├── hooks/
│   │   │   └── usePageSEO.js
│   │   ├── layouts/
│   │   │   ├── AccountLayout.jsx
│   │   │   ├── PanelLayout.jsx
│   │   │   └── WebsiteLayout.jsx
│   │   ├── seller/
│   │   │   ├── ApprovalStatus.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Earnings.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── OrderDetails.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── ReplacementDetails.jsx
│   │   │   ├── Replacements.jsx
│   │   │   ├── Reviews.jsx
│   │   │   └── StoreProfile.jsx
│   │   ├── services/
│   │   │   ├── adminService.js
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── cartService.js
│   │   │   ├── deliveryService.js
│   │   │   ├── orderService.js
│   │   │   ├── paymentService.js
│   │   │   ├── productService.js
│   │   │   ├── sellerService.js
│   │   │   ├── supportService.js
│   │   │   └── userService.js
│   │   ├── user/
│   │   │   ├── Addresses.jsx
│   │   │   ├── Complaints.jsx
│   │   │   ├── MyOrders.jsx
│   │   │   ├── OrderDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── ReplacementRequest.jsx
│   │   ├── utils/
│   │   │   ├── formatCurrency.js
│   │   │   ├── formatDate.js
│   │   │   ├── orderStatus.js
│   │   │   ├── productVariants.js
│   │   │   └── sortNewestFirst.js
│   │   ├── website/
│   │   │   ├── Cart/
│   │   │   │   ├── Cart.jsx
│   │   │   │   ├── CartItems.jsx
│   │   │   │   └── CartSummary.jsx
│   │   │   ├── Checkout/
│   │   │   │   ├── Checkout.jsx
│   │   │   │   ├── CheckoutSummary.jsx
│   │   │   │   ├── OrderConfirmation.jsx
│   │   │   │   └── PaymentStatus.jsx
│   │   │   ├── Home/
│   │   │   │   ├── CategorySection.jsx
│   │   │   │   ├── Hero.jsx
│   │   │   │   ├── HomePage.jsx
│   │   │   │   └── ProductSections.jsx
│   │   │   ├── Products/
│   │   │   │   ├── ProductDetails.jsx
│   │   │   │   ├── ProductFilters.jsx
│   │   │   │   ├── ProductGallery.jsx
│   │   │   │   ├── ProductReviews.jsx
│   │   │   │   ├── Products.jsx
│   │   │   │   └── VariantSelector.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Contact.jsx
│   │   │   └── Policies.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── backend_packages.txt
├── frontend_package.txt
└── README.md
```

Local environment files, installed dependencies and generated build files are omitted from this overview. The structure follows the supplied latest Zupito source ZIP; `README.md` is the new file to place in the repository root.

## Local Setup

### Prerequisites

- Node.js 24.x and npm
- MongoDB Atlas database
- Cloudinary account
- Brevo account with a verified sender
- Razorpay test-mode API credentials and webhook secret

The project's backend and frontend package configurations require Node.js 24.x.

### 1. Clone the Repository

```bash
git clone https://github.com/krushna706/Zupito.git
cd Zupito
```

### 2. Install Dependencies

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

### 3. Configure Environment Variables

Create `backend/.env`:

```env
NODE_ENV=development
PORT=8080
CLIENT_ORIGIN=http://localhost:5173

DB_URI=your_mongodb_connection_string
JWT_SECRET=your_generated_jwt_secret
OTP_SECRET=your_generated_otp_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Zupito Support
COMPANY_NAME=Zupito

RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

TRUST_PROXY_HOPS=0
SERVE_FRONTEND=false
```

Generate separate secrets for `JWT_SECRET` and `OTP_SECRET` by running this command twice:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

Replace the placeholders with your own credentials. Both `JWT_SECRET` and `OTP_SECRET` must be at least 32 characters long. The backend requires Razorpay **test** credentials, including the webhook secret, to start. Keep `.env` files out of version control, and allow the backend connection IP in MongoDB Atlas.

### 4. Start the Backend

```bash
npm run dev --prefix backend
```

### 5. Start the Frontend

Run this command in a separate terminal:

```bash
npm run dev --prefix frontend
```

Open the URL shown by Vite. It should match the backend's `CLIENT_ORIGIN` setting.

The backend health endpoint is available at:

```text
http://localhost:8080/api/health
```

Public signup creates a customer account. Seller accounts use the seller registration form and require admin approval. Admin and delivery agent accounts are not created through public customer signup.

## Deployment

Zupito is available on Render. The application supports a single Web Service deployment: Express serves the frontend production build and the API under the same domain.

- **MongoDB Atlas** stores marketplace data.
- **Cloudinary** stores uploaded images.
- **Brevo** delivers password recovery emails.
- **Razorpay Test Mode** handles simulated online payment workflows.
- **Render environment variables** hold database, email, session and payment configuration.

### Build Command

```bash
npm ci --prefix backend && npm ci --prefix frontend --include=dev && npm run build --prefix frontend
```

### Start Command

```bash
npm start --prefix backend
```

### Production Settings

Alongside the backend service credentials, configure:

```env
NODE_ENV=production
NODE_VERSION=24.22.0
SERVE_FRONTEND=true
CLIENT_ORIGIN=https://zupito.onrender.com
TRUST_PROXY_HOPS=3
VITE_API_URL=/api
```

Set `VITE_API_URL=/api` **at build time** so Vite uses the same-origin API. `CLIENT_ORIGIN` must exactly match the public HTTPS origin without a trailing slash. Razorpay test credentials and the webhook secret remain backend-only; configure the webhook endpoint as:

```text
https://zupito.onrender.com/api/payments/webhook
```

Use the proxy hop count appropriate for the actual Render configuration and verify it against the deployed service. The value above is an example, not a confirmed measurement for this deployment. Render normally supplies `PORT` to the running service.

## Author

**Krushna Chandra Mohanty**

[GitHub](https://github.com/krushna706)
