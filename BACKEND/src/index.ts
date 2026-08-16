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

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());

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