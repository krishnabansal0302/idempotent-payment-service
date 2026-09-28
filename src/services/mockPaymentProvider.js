const processPayment = async (amount, outcome = "SUCCESS") => {
    // Simulate a payment provider response
    if (outcome === "SUCCESS") {
        return {
            status: "SUCCESS",
            response: "Payment approved by mock provider"
        };
    }

    if (outcome === "FAILURE") {
        return {
            status: "FAILED",
            response: "Payment declined by mock provider"
        };
    }

    if (outcome === "TIMEOUT") {
        return {
            status: "TIMEOUT",
            response: "Payment provider timed out"
        };
    }

    return {
        status: "FAILED",
        response: "Invalid payment outcome"
    };
};

module.exports = {
    processPayment
};