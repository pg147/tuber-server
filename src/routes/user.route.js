import express from "express";

// Controllers
import { changeCurrentPassword, createUser, loginUser, logoutUser, renewAccessToken, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";

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
router.post('/refresh-token', renewAccessToken); // token renewal 

router.post('/update/avatar', verifyToken, upload.single('avatar'), updateAvatar);
router.post('/update/cover-image', verifyToken, upload.single('coverImage'), updateCoverImage);
router.post('/update/password', verifyToken, changeCurrentPassword);

export default router;