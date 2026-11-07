const ExpressError = require("../utils/ExpressError");

// Escape dynamic values before inserting them into HTML.
const escapeHtml = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[character]
    );

// Password-reset email template
function createOtpEmail({ company, senderName, name, otp }) {
    const brand = escapeHtml(company);
    const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${brand} password reset</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#071b45">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
        Your password reset code is valid for 10 minutes.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9">
        <tr>
            <td align="center" style="padding:28px 12px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid #e5e9f0;border-radius:16px">
                    <tr>
                        <td style="padding:28px 28px 24px;background:#071b45;border-radius:16px 16px 0 0;border-bottom:4px solid #ff6a00">
                            <p style="margin:0;color:#ff8a38;font-size:28px;font-weight:700;letter-spacing:-0.5px">
                                ${brand}
                            </p>
                            <p style="margin:8px 0 0;color:#d7dfed;font-size:13px;line-height:20px">
                                Everyday essentials. Exceptional finds.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px 28px">
                            <p style="margin:0 0 10px;color:#a74908;font-size:11px;font-weight:700;letter-spacing:1.4px">
                                ACCOUNT SECURITY
                            </p>

                            <h1 style="margin:0 0 22px;color:#071b45;font-size:26px;line-height:34px">
                                Reset your password
                            </h1>

                            <p style="margin:0 0 12px;font-size:15px;line-height:24px">
                                ${greeting}
                            </p>

                            <p style="margin:0 0 24px;color:#526078;font-size:15px;line-height:25px">
                                We received a request to reset your ${brand} account password.
                                Enter the code below on the verification page to continue.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding:23px 12px;background:#fff1e6;border:1px solid #ffd8bb;border-radius:12px">
                                        <p style="margin:0 0 12px;color:#945019;font-size:11px;font-weight:700;letter-spacing:1px">
                                            YOUR VERIFICATION CODE
                                        </p>

                                        <p style="margin:0;color:#071b45;font-family:Consolas,monospace;font-size:32px;font-weight:700;line-height:42px;letter-spacing:6px">
                                            ${otp}
                                        </p>

                                        <p style="margin:12px 0 0;color:#755239;font-size:13px;line-height:20px">
                                            Valid for <strong>10 minutes</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:22px 0 0;color:#526078;font-size:14px;line-height:23px">
                                For your security, do not share this code.
                                Our support team will never ask you to disclose it.
                            </p>

                            <p style="margin:14px 0 0;color:#526078;font-size:14px;line-height:23px">
                                Didn't request this? You can ignore this email.
                                Your password stays unchanged until a reset is completed.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 28px;border-top:1px solid #e8ecf2;background:#fafbfc;border-radius:0 0 16px 16px">
                            <p style="margin:0;color:#071b45;font-size:13px;font-weight:700">
                                ${escapeHtml(senderName)}
                            </p>

                            <p style="margin:7px 0 0;color:#6b778c;font-size:12px;line-height:19px">
                                This is an automated account security email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// Send to the registered account email through Brevo.
async function sendPasswordResetOtpEmail({ toEmail, otp, name = "" }) {
    if (!/^\d{6}$/.test(otp)) {
        throw new TypeError("A six-digit verification code is required.");
    }

    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        throw new ExpressError(
            503,
            "Password recovery email is not configured yet."
        );
    }

    const company = process.env.COMPANY_NAME || "Zupito";
    const senderName =
        process.env.BREVO_SENDER_NAME || `${company} Support`;

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: process.env.BREVO_SENDER_EMAIL,
                },
                to: [{ email: toEmail }],
                subject: `${company} — Reset your password`,
                htmlContent: createOtpEmail({
                    company,
                    senderName,
                    name,
                    otp,
                }),
                textContent:
                    `Hello${name ? ` ${name}` : ""},\n\n` +
                    `Your ${company} password reset code is ${otp}. ` +
                    `It is valid for 10 minutes.\n\n` +
                    `Do not share this code. If you did not request a reset, ` +
                    `ignore this email.\n\n${senderName}`,
                tags: ["password-reset"],
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok || !(await response.json()).messageId) {
            throw new Error("Email rejected");
        }
    } catch {
        throw new ExpressError(
            503,
            "Unable to send the recovery email. Please try again later."
        );
    }
}

module.exports = { sendPasswordResetOtpEmail };