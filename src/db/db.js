import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        console.log("Database connected at host : ", connectionInstance.connection.host);
    } catch (error) {
        console.error("Error connecting database : ", error.message);
        process.exit(1);  // end process with exit code 1
    }
}

export default connectDB;