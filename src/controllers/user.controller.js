import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from "jsonwebtoken";

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        let accessToken;
        let refreshToken;

        if (user) {
            accessToken = await user.generateAccessToken();
            refreshToken = await user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save({
                validateBeforeSave: false
            });
        }

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("Error generating tokens : ", error.message);
    }
}

const createUser = asyncHandler(async (req, res) => {
    const { username, fullName, email, password } = req.body;

    // Validations to check if all fields are not empty
    if ([username, fullName, email, password].some((field) => field?.trim() === "")) {
        return res.status(400).json({
            success: false,
            message: "All fields are required!"
        })
    }

    // Checking if the user already exists
    const userExist = await User.findOne({
        $or: [{ username: username }, { email: email }]
    });

    // If user already exists
    if (userExist) {
        return res.status(409).json({
            success: false,
            message: `User with email : ${email} already exists!`
        })
    };

    // Fetching images from req
    let avatarLocalPath;
    let coverLocalPath;

    // Only if Avatar or Cover image is present    
    if (req.files && req.files.avatar) {
        avatarLocalPath = req.files?.avatar[0]?.path;
    } else if (req.files && req.files.coverImage) {
        coverLocalPath = req.files?.coverImage[0]?.path;
    }

    // Uploading images on Cloudinary
    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : "";
    const coverImage = coverLocalPath ? await uploadOnCloudinary(coverLocalPath) : "";

    // Create a new user with User Model
    const user = await User.create({
        username: username,
        fullName: fullName,
        email: email,
        password: password,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || ""
    });

    // Fetching created user except pwd and token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // If created user doesn't exist
    if (!createdUser) {
        return res.status(500).json({
            success: false,
            message: "User creation failed!"
        });
    }

    return res.status(200).json({
        success: true,
        message: `Welcome ${user.email} to Tuber!`,
        data: createdUser
    })
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validations to check if both email and password are provided
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Both email and password must be provided!'
        });
    }

    // Checking if the user exists in Database
    const user = await User.findOne({ $or: [{ email }, { password }] });

    // If no user exists
    if (!user) {
        return res.status(404).json({
            success: false,
            message: `User with ${email} doesn't exist`,
        });
    }

    // Checking password with schema method
    const checkPassword = await user.isPasswordCorrect(password);

    // If password check fails
    if (!checkPassword) {
        return res.status(400).json({
            success: false,
            message: 'Invalid password! try again.'
        });
    }

    // Generating tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // If token creation fails
    if (!accessToken || !refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Error generating tokens!'
        });
    }

    // Logged-in user
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Options for cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({
            success: true,
            message: `${email} logged in successfully!`,
            user: loggedInUser, accessToken, refreshToken
        })
});

const logoutUser = asyncHandler(async (req, res) => {
    const loggedOut = await User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: ""
        }
    }, { new: true });

    if (!loggedOut) {
        return res.status(400).json({
            success: false,
            message: "Unable to log out ! try again later."
        })
    }

    // Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json({
            success: true,
            message: "User logged out successfully!",
        });
});

const renewAccessToken = async (req, res) => {
    const cookieRefreshToken = req.cookies?.refreshToken || req.body.cookies;

    if (!cookieRefreshToken) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access!"
        });
    }

    try {
        // Decoding received refresh token
        const decodedRefreshToken = jwt.verify(cookieRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Fetching user using id from decoded token
        const user = await User.findById(decodedRefreshToken?._id).select("-password");

        // If no user is found with the decoded token id
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token!"
            });
        }

        // If received refresh token and stored refresh token don't match
        if (user?.refreshToken !== cookieRefreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh Token has expired or used"
            });
        }

        // Generating tokens
        const { accessToken, refreshToken } = await generateTokens(user._id);

        // If token creation fails
        if (!accessToken || !refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Error generating tokens!'
            });
        }

        // Cookie options
        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                message: "Token renewed successfully!"
            });

    } catch (error) {
        console.log("Error renewing token : ", error.message);
    }
}

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (newPassword !== confirmPassword) return res.status(400).json({
        success: false,
        message: "New Password and Confirm password don't match"
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "You need to login first!"
        });
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        return res.status(400).json({
            success: false,
            message: "Invalid old password!"
        })
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
        success: true,
        message: "Password updated successfully!",
    });
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({
        success: false,
        message: "No user found!"
    });

    return res.status(200).json({
        success: true,
        user
    });
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    const user = req.user;

    if (!fullName || !email) return res.status(400).json({
        success: false,
        message: "All fields are required!"
    });

    const updatedUser = await User.findByIdAndUpdate(user._id, {
        $set: {
            fullName,
            email
        }
    }, { new: true }).select("-password");

    if (!updatedUser) return res.status(400).json({
        success: false,
        message: "Error updating user"
    });

    return res.status(200).json({
        success: true,
        message: "User updated successfully!",
        updatedUser
    });
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) return res.status(400).json({
        success: false,
        message: "Please provide an avatar!"
    });

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) return res.status(400).json({
        success: false,
        message: "Error uploading avatar."
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar?.url
        }
    }, { new: true }).select("-password -refreshToken");

    if (!updatedUser) return res.status(400).json({
        success: false,
        message: "Error updating avatar!"
    });

    return res.status(200).json({
        success: true,
        message: "Avatar updated successfully!",
        avatar: updatedUser.avatar
    });
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) return res.status(400).json({
        success: false,
        message: "Please provide a cover image!"
    });

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) return res.status(400).json({
        success: false,
        message: "Error uploading cover image."
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            coverImage: coverImage?.url
        }
    }, { new: true }).select("-password -refreshToken");

    if (!updatedUser) return res.status(400).json({
        success: false,
        message: "Error updating cover image!"
    });

    return res.status(200).json({
        success: true,
        message: "Cover image updated successfully!",
        coverImage: updatedUser.coverImage
    });
})

export {
    createUser,
    loginUser,
    logoutUser,
    renewAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverImage
};