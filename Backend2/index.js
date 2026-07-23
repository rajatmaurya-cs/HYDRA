const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// 1. Root route to verify test server status
app.get('/', (req, res) => {
  res.json({
    message: "Hydra Test Backend (Backend2) is running on port " + PORT,
    endpoints: {
      webhookReceiver: "POST http://localhost:" + PORT + "/webhook",
      sendEventToHydra: "POST http://localhost:" + PORT + "/send-event"
    }
  });
});

// 2. Webhook Receiver Endpoint (Receives webhooks dispatched by Hydra)
app.post('/webhook', (req, res) => {
  console.log("\n=======================================================");
  console.log("📥 RECEIVED WEBHOOK FROM HYDRA at", new Date().toISOString());
  console.log("=======================================================");
  console.log("🔑 Headers:", {
    'hydra-signature': req.headers['hydra-signature'],
    'idempotency-key': req.headers['idempotency-key'],
    'content-type': req.headers['content-type']
  });
  console.log("📦 Payload Data:", JSON.stringify(req.body, null, 2));
  console.log("=======================================================\n");

  // Respond with 200 OK to acknowledge successful delivery to Hydra
  res.status(200).json({
    status: "success",
    message: "Webhook received successfully by Backend2!"
  });
});

// 3. Helper Endpoint to trigger sending an event to Hydra (POST /v1/events)
app.post('/send-event', async (req, res) => {
  
  const { apiKey, event, data } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      error: "Missing apiKey. Please provide 'apiKey' in request body."
    });
  }

  const payloadToSend = {
    event: event || "payment.success",
    data: data || {
      paymentId: "pay_" + Math.floor(Math.random() * 100000),
      amount: 1500,
      currency: "INR",
      user: "john_doe"
    },
    timestamp: new Date().toISOString()
  };

  const idempotencyKey = "test_order_" + Date.now();

  console.log(`\n🚀 Sending event [${payloadToSend.event}] to Hydra (http://localhost:2000/v1/events)...`);

  try {
    const response = await fetch("http://localhost:2000/v1/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payloadToSend)
    });

    const hydraResponse = await response.json();

    console.log("✅ Hydra Response Status:", response.status);
    console.log("📄 Hydra Response Body:", hydraResponse);

    res.status(response.status).json({
      sentPayload: payloadToSend,
      hydraResponse: hydraResponse
    });
  } catch (error) {
    console.error("❌ Failed to reach Hydra server:", error.message);
    res.status(500).json({
      error: "Failed to connect to Hydra server at http://localhost:2000",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Test Server (Backend2) running on http://localhost:${PORT}`);
  console.log(`📌 Register this Webhook URL in Hydra: http://localhost:${PORT}/webhook\n`);
});
