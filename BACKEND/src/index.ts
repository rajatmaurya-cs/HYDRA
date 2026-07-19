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

app.use("/api/auth", authRoutes);

export default app;