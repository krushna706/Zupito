export default function DeliveryOTP({ otp, visible, onToggle, isDemo }) {
    return (
        <div className="customer-detail-otp-card">
            <div className="customer-detail-otp-heading">
                <span>
                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                </span>

                <div>
                    <h3>Delivery Verification</h3>
                    <p>One-time delivery code</p>
                </div>
            </div>

            <div className="customer-detail-otp-value">
                <strong>{visible ? otp : "••••••"}</strong>

                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={visible ? "Hide delivery OTP" : "Show delivery OTP"}
                >
                    <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
            </div>

            <p>Share this code only with the delivery agent when this package reaches your doorstep.</p>

            {isDemo && <small>Sample OTP for design preview only.</small>}
        </div>
    );
}
