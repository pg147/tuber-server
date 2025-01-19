// Dependencies
import dotenv from "dotenv";

// Database Connection
import connectDB from "./db/db.js";

// Express app
import { app } from "./app.js";

dotenv.config();  // configured dotenv

const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log("Server running at : ", PORT);
        });
    })
    .catch((error) => console.error(error));