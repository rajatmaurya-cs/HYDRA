const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Hardcoded Default Credentials for quick testing
const HARDCODED_API_KEY = "hdr_test_de728af8";
const HARDCODED_EVENT_TYPE = "payment.success";
const HARDCODED_PAYLOAD = {
  paymentId: "pay_998877",
  amount: 2500,
  currency: "INR",
  customer: "Rajat Maurya",
  status: "COMPLETED"
};

// 1. Root route to verify test server status
app.get('/', (req, res) => {
  res.json({
    message: "Hydra Test Backend (Backend2) is running on port " + PORT,
    hardcodedDefaults: {
      apiKey: HARDCODED_API_KEY,
      event: HARDCODED_EVENT_TYPE,
      payload: HARDCODED_PAYLOAD
    },
    endpoints: {
      webhookReceiver: "POST http://localhost:" + PORT + "/webhook",
      sendEventToHydra: "POST or GET http://localhost:" + PORT + "/send-event"
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

  // Respond with 200 OK to acknowledge successful delivery
  res.status(200).json({
    status: "success",
    message: "Webhook received successfully by Backend2!"
  });
});

// Helper function to execute event dispatching to Hydra on port 2000
async function dispatchEventToHydra(apiKey, event, data) {
  const targetApiKey = apiKey || HARDCODED_API_KEY;
  const targetEventType = event || HARDCODED_EVENT_TYPE;
  const targetPayloadData = data || HARDCODED_PAYLOAD;

  const payloadToSend = {
    event: targetEventType,
    data: targetPayloadData,
    timestamp: new Date().toISOString()
  };

  const idempotencyKey = "test_order_" + Date.now();

  console.log(`\n🚀 Dispatching event [${payloadToSend.event}] to Hydra (http://localhost:2000/v1/events)...`);
  console.log(`🔑 Using API Key: ${targetApiKey}`);
  console.log(`📦 Payload:`, JSON.stringify(payloadToSend, null, 2));

  const response = await fetch("http://localhost:2000/v1/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${targetApiKey}`,
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payloadToSend)
  });

  const hydraResponse = await response.json();

  console.log("✅ Hydra Response Status:", response.status);
  console.log("📄 Hydra Response Body:", hydraResponse);

  return {
    statusCode: response.status,
    sentPayload: payloadToSend,
    usedApiKey: targetApiKey,
    hydraResponse: hydraResponse
  };
}

// 3. Helper Endpoint to trigger sending an event to Hydra (POST /send-event)
app.post('/send-event', async (req, res) => {
  const { apiKey, event, data } = req.body || {};

  try {
    const result = await dispatchEventToHydra(apiKey, event, data);
    res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("❌ Failed to connect to Hydra server:", error.message);
    res.status(500).json({
      error: "Failed to connect to Hydra server at http://localhost:2000",
      details: error.message
    });
  }
});

// Also support GET /send-event for quick testing directly from the browser!
app.get('/send-event', async (req, res) => {
  try {
    const result = await dispatchEventToHydra();
    res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("❌ Failed to connect to Hydra server:", error.message);
    res.status(500).json({
      error: "Failed to connect to Hydra server at http://localhost:2000",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Test Server (Backend2) running on http://localhost:${PORT}`);
  console.log(`📌 Webhook Receiver: http://localhost:${PORT}/webhook`);
  console.log(`📌 Trigger Event to Hydra: http://localhost:${PORT}/send-event\n`);
});
