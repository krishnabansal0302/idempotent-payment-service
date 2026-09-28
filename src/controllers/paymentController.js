const pool = require("../config/db");
const { processPayment } = require("../services/mockPaymentProvider");

const createPayment = async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const userId = req.user.userId;

        // Idempotency key must come from the client
        const idempotencyKey = req.headers["idempotency-key"];

        if (!idempotencyKey) {
            return res.status(400).json({
                message: "Idempotency-Key header is required"
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than 0"
            });
        }

        // Check whether this request was already processed
        const existingPayment = await pool.query(
            `SELECT *
             FROM payments
             WHERE idempotency_key = $1`,
            [idempotencyKey]
        );

        if (existingPayment.rows.length > 0) {
            return res.status(200).json({
                message: "Payment already exists",
                payment: existingPayment.rows[0]
            });
        }

        // Create new payment
        const result = await pool.query(
            `INSERT INTO payments
                (user_id, amount, currency, status, idempotency_key)
             VALUES ($1, $2, $3, 'PENDING', $4)
             RETURNING *`,
            [
                userId,
                amount,
                currency || "INR",
                idempotencyKey
            ]
        );

        res.status(201).json({
            message: "Payment created successfully",
            payment: result.rows[0]
        });

    } catch (error) {
        console.error("PAYMENT ERROR:", error);

        res.status(500).json({
            message: "Payment creation failed",
            error: error.message
        });
    }
};

const processExistingPayment = async (req, res) => {
    try {
        const paymentId = req.params.id;
        const userId = req.user.userId;

        // Check that the payment belongs to this user
        const paymentResult = await pool.query(
            `SELECT *
             FROM payments
             WHERE id = $1 AND user_id = $2`,
            [paymentId, userId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        const payment = paymentResult.rows[0];

        // Don't process an already successful payment
        if (payment.status === "SUCCESS") {
            return res.status(400).json({
                message: "Payment is already successful"
            });
        }

        // Choose SUCCESS, FAILURE or TIMEOUT
        const outcome = req.body.outcome || "SUCCESS";

        const providerResult = await processPayment(
            payment.amount,
            outcome
        );

        // Count previous attempts
        const attemptResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM payment_attempts
             WHERE payment_id = $1`,
            [paymentId]
        );

        const attemptNumber =
            parseInt(attemptResult.rows[0].count) + 1;

        // Record the attempt
        await pool.query(
            `INSERT INTO payment_attempts
                (payment_id, attempt_number, status, provider_response)
             VALUES ($1, $2, $3, $4)`,
            [
                paymentId,
                attemptNumber,
                providerResult.status,
                providerResult.response
            ]
        );

        // Update payment status
        const updatedPayment = await pool.query(
            `UPDATE payments
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [providerResult.status, paymentId]
        );

        res.json({
            message: "Payment processed",
            payment: updatedPayment.rows[0],
            attempt: attemptNumber
        });

    } catch (error) {
        console.error("PROCESS PAYMENT ERROR:", error);

        res.status(500).json({
            message: "Payment processing failed",
            error: error.message
        });
    }
};

const retryPayment = async (req, res) => {
    try {
        const paymentId = req.params.id;
        const userId = req.user.userId;

        const paymentResult = await pool.query(
            `SELECT *
             FROM payments
             WHERE id = $1 AND user_id = $2`,
            [paymentId, userId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== "TIMEOUT") {
            return res.status(400).json({
                message: "Only timed-out payments can be retried"
            });
        }

        // For our demo, retry always succeeds
        const providerResult = await processPayment(
            payment.amount,
            "SUCCESS"
        );

        const attemptResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM payment_attempts
             WHERE payment_id = $1`,
            [paymentId]
        );

        const attemptNumber =
            parseInt(attemptResult.rows[0].count) + 1;

        await pool.query(
            `INSERT INTO payment_attempts
                (payment_id, attempt_number, status, provider_response)
             VALUES ($1, $2, $3, $4)`,
            [
                paymentId,
                attemptNumber,
                providerResult.status,
                providerResult.response
            ]
        );

        const updatedPayment = await pool.query(
            `UPDATE payments
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [providerResult.status, paymentId]
        );

        res.json({
            message: "Payment retried successfully",
            payment: updatedPayment.rows[0],
            attempt: attemptNumber
        });

    } catch (error) {
        console.error("RETRY ERROR:", error);

        res.status(500).json({
            message: "Payment retry failed",
            error: error.message
        });
    }
};

const getPayment = async (req, res) => {
    try {
        const paymentId = req.params.id;
        const userId = req.user.userId;

        const paymentResult = await pool.query(
            `SELECT *
             FROM payments
             WHERE id = $1 AND user_id = $2`,
            [paymentId, userId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        const attemptsResult = await pool.query(
            `SELECT *
             FROM payment_attempts
             WHERE payment_id = $1
             ORDER BY attempt_number`,
            [paymentId]
        );

        res.json({
            payment: paymentResult.rows[0],
            attempts: attemptsResult.rows
        });

    } catch (error) {
        console.error("GET PAYMENT ERROR:", error);

        res.status(500).json({
            message: "Could not fetch payment"
        });
    }
};

const getPayments = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT *
             FROM payments
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            count: result.rows.length,
            payments: result.rows
        });

    } catch (error) {
        console.error("GET PAYMENTS ERROR:", error);

        res.status(500).json({
            message: "Could not fetch payments"
        });
    }
};

module.exports = {
    createPayment,
    processExistingPayment,
    retryPayment,
    getPayment,
    getPayments
};
