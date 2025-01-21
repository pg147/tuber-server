import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        let accessToken;
        let refreshToken;
    
        if (user) {
            accessToken = await user.generateAccessToken();
            refreshToken = await user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save();
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
    const tokens = await generateTokens(user._id);

    // If token creation fails
    if (!tokens) {
        return res.status(400).json({
            success: false,
            message: 'Error generating tokens!'
        });
    }

    return res.status(200).json({
        success: true,
        message: `${email} logged in successfully!`,
        tokens: tokens
    })
});

export { createUser, loginUser };