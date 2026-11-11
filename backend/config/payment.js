exports.getPaymentConfig = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keyId?.startsWith("rzp_test_") || !keySecret || !webhookSecret) {
        throw new Error("Configure Razorpay test credentials and webhook secret in backend/.env.");
    }

    return { keyId, keySecret, webhookSecret };
};
