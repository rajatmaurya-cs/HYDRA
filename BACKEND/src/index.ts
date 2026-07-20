import express from "express";
import cors from "cors";
import "dotenv/config";

import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server Running");
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
app.use("/api/events", eventRoutes);
app.use("/v1/events", eventRoutes);
app.use("/api/v1/events", eventRoutes);

export default app;