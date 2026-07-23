await axios.post(
  "https://api.hydra.com/v1/events",
  {
    event: "payment.completed",
    data: {
      paymentId: "pay_123",
      amount: 500,
      currency: "INR",
      customerId: "cus_456"
    },
    timestamp: new Date().toISOString()
  },
  {
    headers: {
      Authorization: "Bearer hydra_live_abc123xyz",
      "Idempotency-Key": "order_123_payment_created_v1",
      "Content-Type": "application/json"
    }
  }
);