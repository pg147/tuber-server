import express from "express";

// Controllers
import { createUser, loginUser, logoutUser } from "../controllers/user.controller.js";

// Middlewares
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();  // user router

router.post('/create', upload.fields([
    {
        name: 'avatar',
        maxCount: 1
    },
    {
        name: 'coverImage',
        maxCount: 1
    }
]), createUser);  // signup

router.post('/login', loginUser);  // login

// Secured routes ( middlewares )
router.post('/logout', verifyToken, logoutUser);  // logout

export default router;