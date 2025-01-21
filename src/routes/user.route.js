import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createUser, loginUser } from "../controllers/user.controller.js";

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
]), createUser);

router.get('/login', loginUser);

export default router;