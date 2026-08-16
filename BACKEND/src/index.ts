import express from "express";
import cors from "cors";
import "dotenv/config";

import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.startsWith("http://localhost:") ||
        origin.endsWith(".vercel.app") ||
        origin === process.env.FRONTEND_URL ||
        origin === process.env.FRONTED_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
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