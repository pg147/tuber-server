import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Middleware - for CORS
app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGIN,
    credentials: true
}));

// Middleware - for JSON
app.use(express.json({
    limit: '16kb'
}));

// Middleware - for parsing Cookies
app.use(cookieParser());

// Middleware - for better URL Encoding
app.use(express.urlencoded({ extended: true }));

// Middleware - for serving static files
app.use(express.static('public'));

export { app };