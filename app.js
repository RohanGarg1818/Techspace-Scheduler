import "dotenv/config";
import express from "express";
import cors from "cors";
import healthCheckRouter from "./routes/healthcheck.routes.js";

const app = express();

// basic configuration
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// cors configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// healthcheck route
app.get("/", (req, res) => {
  res.send("Hello there!");
});
app.use("/api/v1/healthcheck", healthCheckRouter);

// Global Error-Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
      ...(err.details && { details: err.details }),
    },
    ...(err.extra || {}),
  };

  return res.status(statusCode).json(response);
});
