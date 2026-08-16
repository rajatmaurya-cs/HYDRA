import express from "express";
import cors from "cors";
import "dotenv/config";

import cookieParser from "cookie-parser";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  process.env.FRONTEND_URL,
  process.env.FRONTED_URL,
].filter(Boolean) as string[];

console.log("🔒 Configured CORS Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log(`📡 Incoming Request Origin: [${origin || "No Origin"}]`);
      if (!origin || allowedOrigins.includes(origin)) {
        console.log(`✅ Origin [${origin}] MATCHED allowedOrigins.`);
        return callback(null, true);
      }
      console.error(`❌ CORS BLOCKED: Origin [${origin}] NOT found in allowedOrigins:`, allowedOrigins);
      return callback(new Error(`CORS blocked: Origin [${origin}] is not allowed.`));
    },
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    service: "HYDRA Event Ingress & Webhook Delivery Engine",
    status: "online",
    version: "1.0.0",
    health: "/health",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "hydra",
  });
});



import authRoutes from "./routes/auth.route";
import organizationRoutes from "./routes/organization.route";
import endpointRoutes from "./routes/endpoint.route";
import apiKeyRoutes from "./routes/apikey.route";
import eventRoutes from "./routes/event.route";

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/endpoints", endpointRoutes);
app.use("/api/api-keys", apiKeyRoutes);

app.use("/v1/events", eventRoutes);

export default app;