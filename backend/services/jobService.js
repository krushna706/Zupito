const { randomUUID } = require("node:crypto");
const Job = require("../models/BackgroundJob");

// A renewable lease prevents workers on separate instances claiming the same schedule.
// Individual handlers still use database idempotency keys for crash recovery.
exports.schedule = (key, interval, handler) => {
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        let heartbeat;
        const token = randomUUID();
        try {
            await Job.updateOne({ key }, { $setOnInsert: { key } }, { upsert: true });
            const job = await Job.findOneAndUpdate(
                {
                    key,
                    status: { $ne: "Review" },
                    nextRunAt: { $lte: new Date() },
                    lockUntil: { $lte: new Date() },
                },
                {
                    $set: {
                        status: "Running",
                        lockToken: token,
                        lockUntil: new Date(Date.now() + 120000),
                    },
                },
                { returnDocument: "after" }
            );
            if (!job) return;
            heartbeat = setInterval(() => {
                void Job.updateOne(
                    { key, lockToken: token },
                    { $set: { lockUntil: new Date(Date.now() + 120000) } }
                ).catch(() => {});
            }, 30000);
            heartbeat.unref();
            await handler();
            await Job.updateOne(
                { key, lockToken: token },
                {
                    $set: {
                        status: "Pending",
                        attempts: 0,
                        lastError: "",
                        lastCompletedAt: new Date(),
                        nextRunAt: new Date(Date.now() + interval),
                        lockUntil: new Date(0),
                    },
                    $unset: { lockToken: 1 },
                }
            );
        } catch (error) {
            const job = await Job.findOne({ key, lockToken: token })
                .lean()
                .catch(() => null);
            if (job)
                await Job.updateOne(
                    { _id: job._id, lockToken: token },
                    {
                        $set: {
                            status: job.attempts >= 4 ? "Review" : "Pending",
                            nextRunAt: new Date(
                                Date.now() + Math.min(3600000, 15000 * 2 ** job.attempts)
                            ),
                            lockUntil: new Date(0),
                            lastError: String(error.message || "Worker failed").slice(0, 300),
                        },
                        $inc: { attempts: 1 },
                        $unset: { lockToken: 1 },
                    }
                ).catch(() => {});
            console.warn(`${key}: background processing pending.`);
        } finally {
            clearInterval(heartbeat);
            running = false;
        }
    };
    void run();
    const timer = setInterval(run, Math.min(interval, 15000));
    timer.unref();
    return () => clearInterval(timer);
};
