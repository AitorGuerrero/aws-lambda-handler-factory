"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeSqs {
    constructor() {
        this.nextId = 0;
        this.queues = {};
    }
    receiveMessage(opts, cb) {
        if (this.queues[opts.QueueUrl].fifoMode && this.areInFlightMessages(opts.QueueUrl)) {
            return cb(null, { Messages: [] });
        }
        this.queues[opts.QueueUrl].batches
            .filter((m) => m.retries >= 3)
            .filter((m) => m.deleted === false)
            .forEach((m) => m.deleted = true);
        const messages = this.queues[opts.QueueUrl].batches
            .filter((m) => m.deleted === false)
            .filter((m) => m.inFlight === false)
            .slice(0, this.queues[opts.QueueUrl].batchLength);
        messages.forEach((m) => m.inFlight = true);
        messages.forEach((m) => m.retries++);
        cb(null, { Messages: messages.length === 0 ? undefined : messages.map((m) => m.message) });
    }
    deleteMessageBatch(req, cb) {
        for (const m of req.Entries) {
            this.queues[req.QueueUrl].batches.find((n) => m.Id === n.message.MessageId).deleted = true;
        }
        cb(null, { Failed: [] });
    }
    addMessages(queueUrl, messages) {
        this.queues[queueUrl].batches = this.queues[queueUrl].batches
            .concat(messages.map((message) => ({
            deleted: false,
            inFlight: false,
            message: {
                Body: JSON.stringify(message),
                MessageId: String(++this.nextId),
            },
            retries: 0,
        })));
    }
    addQueue(queueUrl, fifoMode = false, batchLength = 3) {
        this.queues[queueUrl] = { batches: [], fifoMode, batchLength };
    }
    resetInFlight(queueUrl) {
        return this.queues[queueUrl].batches.map((m) => m.inFlight = false);
    }
    getAvailableMessages(queueUrl) {
        return this.queues[queueUrl].batches
            .filter((m) => m.deleted === false)
            .filter((m) => m.inFlight === false);
    }
    areInFlightMessages(queueUrl) {
        return this.queues[queueUrl].batches.filter((m) => m.deleted === false).find((m) => m.inFlight);
    }
}
exports.FakeSqs = FakeSqs;
