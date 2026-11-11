const {
    createCipheriv,
    createDecipheriv,
    createHash,
    createHmac,
    randomBytes,
    randomInt,
    timingSafeEqual,
} = require("node:crypto");

const ExpressError = require("../utils/ExpressError");

const DELIVERY_TTL = 10 * 60 * 1000;
const PICKUP_TTL = 24 * 60 * 60 * 1000;

const secret = () => createHash("sha256").update(`${process.env.OTP_SECRET}:delivery-otp`).digest();

const digest = (taskId, otp) =>
    createHmac("sha256", secret()).update(`${taskId}:${otp}`).digest("hex");

function encrypt(value) {
    const iv = randomBytes(12);

    const cipher = createCipheriv("aes-256-gcm", secret(), iv);

    const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

    return [iv, cipher.getAuthTag(), data].map((item) => item.toString("base64url")).join(".");
}

function decrypt(value) {
    if (!value) return null;

    try {
        const [nonce, tag, data] = value.split(".").map((item) => Buffer.from(item, "base64url"));

        const decipher = createDecipheriv("aes-256-gcm", secret(), nonce);

        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

// ================== GENERATE OTP ==================
exports.issue = (task, purpose = "delivery") => {
    const otp = String(randomInt(0, 1000000)).padStart(6, "0");

    task.otpHash = digest(task._id, otp);
    task.otpCiphertext = encrypt(otp);

    task.otpExpiresAt = new Date(Date.now() + (purpose === "pickup" ? PICKUP_TTL : DELIVERY_TTL));

    task.otpIssuedAt = new Date();
    task.otpAttempts = 0;
};

// ================== REMOVE OTP ==================
exports.clear = (task) => {
    task.otpHash = undefined;
    task.otpCiphertext = undefined;
    task.otpExpiresAt = undefined;
    task.otpIssuedAt = undefined;
    task.otpAttempts = 0;
};

// Only ownership-verified routes can disclose a code.
exports.code = (task) => {
    if (!task?.otpCiphertext || !task?.otpExpiresAt || new Date(task.otpExpiresAt) <= new Date()) {
        return null;
    }

    return decrypt(task.otpCiphertext);
};

// Only the owning customer can see a delivery OTP.
exports.customerCode = (task) => {
    if (
        !task ||
        task.stage !== "out_for_delivery" ||
        !task.otpExpiresAt ||
        task.otpExpiresAt <= new Date()
    ) {
        return null;
    }

    return exports.code(task);
};

// ================== VERIFY OTP ==================
exports.verify = (task, otp) => {
    if (!/^\d{6}$/.test(String(otp || ""))) {
        throw new ExpressError(400, "Enter a valid 6-digit OTP.");
    }

    if (!task.otpExpiresAt || task.otpExpiresAt <= new Date()) {
        throw new ExpressError(409, "OTP expired. Request a fresh code.");
    }

    if (task.otpAttempts >= 5) {
        throw new ExpressError(429, "OTP verification locked. Contact Admin.");
    }

    const expected = Buffer.from(task.otpHash || "", "hex");

    const actual = Buffer.from(digest(task._id, String(otp)), "hex");

    return expected.length === actual.length && timingSafeEqual(expected, actual);
};
