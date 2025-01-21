import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.toString(),
    api_key: process.env.CLOUDINARY_API_KEY.toString(),
    api_secret: process.env.CLOUDINARY_API_SECRET.toString()
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        });

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);  // remove the temp image/file from the server
        console.log("CLoudinary :: Error uploading : ", error.message);
        return null;
    }
}

export { uploadOnCloudinary };