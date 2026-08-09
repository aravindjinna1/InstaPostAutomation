
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const accountRoutes = require("./routes/accountRoutes");
const jobRoutes = require("./routes/jobRoutes");

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health check route (confirms server is alive) ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/jobs", jobRoutes);


module.exports = app;

