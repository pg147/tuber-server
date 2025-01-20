import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

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
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;
    let avatarURL;
    let coverImageURL;

    // Only if Avatar or Cover image is present
    if (avatarLocalPath || coverLocalPath) {
        const uploadAvatar = uploadOnCloudinary(avatarLocalPath);
        if (uploadAvatar) avatarURL = uploadAvatar.secure_url;

        const uploadCoverImage = uploadOnCloudinary(coverLocalPath);
        if (uploadCoverImage) coverImageURL = uploadCoverImage.secure_url;
    }

    // Create a new user with User Model
    const user = await User.create({
        username: username,
        fullName: fullName,
        email: email,
        password: password,
        avatar: avatarURL ? avatarURL : null,
        coverImage: coverImageURL ? coverImageURL : null
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

export { createUser };