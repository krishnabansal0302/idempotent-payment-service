const express = require("express");
const { body, validationResult } = require("express-validator");
const authenticate = require("../middleware/authMiddleware");

const {
    createPayment,
    processExistingPayment,
    retryPayment,
    getPayment,
    getPayments
} = require("../controllers/paymentController");

const router = express.Router();

router.post(
    "/",
    authenticate,

    [
        body("amount")
            .isFloat({ gt: 0 })
            .withMessage("Amount must be greater than 0"),

        body("currency")
            .isLength({ min: 3, max: 3 })
            .withMessage("Currency must be exactly 3 letters")
            .isAlpha()
            .withMessage("Currency must contain only letters")
    ],

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        next();
    },

    createPayment
);

router.get("/", authenticate, getPayments);

router.post(
    "/:id/process",
    authenticate,
    processExistingPayment
);

router.post(
    "/:id/retry",
    authenticate,
    retryPayment
);

router.get("/:id", authenticate, getPayment);


module.exports = router;