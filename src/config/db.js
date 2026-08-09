const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in .env");
    }

    const dbName = process.env.MONGO_DB_NAME || "AutoInsta";
    await mongoose.connect(uri, { dbName });
    console.log(`[DB] MongoDB connected successfully to database: ${dbName}`);
  } catch (err) {
    console.error("[DB] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;