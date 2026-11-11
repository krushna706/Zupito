const AuditLog = require("../models/AuditLog");
// Store decisions, not passwords, OTPs or provider payloads.
exports.record = (actorUserId, action, resourceId, note = "", session = null) =>
    AuditLog.create([{ actorUserId, action, resourceId: String(resourceId), note }], { session });
