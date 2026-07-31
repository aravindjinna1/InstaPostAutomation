

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health check route (confirms server is alive) ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});
app.get("/",(req,res)=>{
    return res.status(200).json({
        message:"wolcome to my server "
    })
})

module.exports = app;

