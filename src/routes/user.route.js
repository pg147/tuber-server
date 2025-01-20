import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createUser } from "../controllers/user.controller.js";

const router = express.Router();

router.post('/create', upload.fields([
    {
        name: 'avatar',
        maxCount: 1
    },
    {
        name: 'coverImage',
        maxCount: 1
    }
]), createUser)

export default router;