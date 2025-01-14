import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { upload } from '../middlewares/multer.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateRefreshandAccessToken = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;   
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken} 

    } catch (error) {
        throw new ApiError(500, "something went wrong and token generation failed")
        
    }

}

const registerUser = asyncHandler(async (req, res) => {
    //get user details
    //validation
    //check whether user already exists from email
    //check for images, check for avatar
    //if present, send to cloudinary
    //create user object - save to db
    //remove password and refresh token from response 
    //check for user creation 
    //return respose 
    
    const {fullName, email, username, password} = req.body
    console.log(email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    
    if(existedUser){
        throw new ApiError(409, "User already exists")
    }
    //console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500, "Image upload failed")
    }   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "User creation failed")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    //get user details
    //validation of username email
    //check for user and find
    //check password
    //access and refresh token
    //send cookies

    const {email,username,password} = req.body

    if(!email && !username){
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({$or: [{email}, {username}]});

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials")
    }

    const {refreshToken,accessToken} = await generateRefreshandAccessToken(user._id) 
    //console.log(accessToken, refreshToken);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, loggedInUser,accessToken,refreshToken, "User logged in successfully")
    )

});

const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "User not authenticated");
    }

    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken!=user?.refreshToken){
            throw new ApiError(401, "Refresh token is used")
        }
    
        const options = {
            httpOnly: true,
            secure: true   
        }
        
        const {newAccessToken, newRefreshToken} = await generateRefreshandAccessToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {accessToken: newAccessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully")
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }
});
export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}