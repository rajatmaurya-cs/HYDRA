import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running");
});

import authRoutes from "./routes/auth.route";

app.use("/api/auth", authRoutes);

export default app;