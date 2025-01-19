import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/db.js";

dotenv.config();
const PORT = process.env.PORT;
const app = express();

app.listen(PORT, () => {
    console.log("Server started at : ", PORT);
    connectDB();
})
