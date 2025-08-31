import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../model/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}
const registerUser=asyncHandler(async(req,res)=>{
    //get user detail from frontend
    //validation-not empty
    //check if user already exists:username,email
    //check for images,check for avatar 
    //upload them to cloudinary,avatar
    //create user object-creation entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response


    const{fullname,email,username,password}=req.body
    console.log("email:",email);

    if(
        [fullname,email,username,password].some((field)=>
            field?.trim()==""

        )
    ){
        throw new ApiError(400,"all fields are required")

    }
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exist ")

    } 
    //console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path;
    
    //const coverImageLocalPath=req.files?.coverImages[0]?.path;
    let coverImageLocalPath;
    if(req.files&& Array.isArray(req.files.coverImages)&& req.files.coverImages.length>0){
        coverImageLocalPath=req.files.coverImages[0]?.path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImages=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImages:coverImages?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )



    // if(fullname==""){
    //     throw new ApiError(
    //         400,"full name is required"

    //     )
    

    })

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or email
    //find user
    //password check
    //access and refresh token generation
    //send cookies


    const{email,password,username}=req.body

    if(!email || !username){
        throw new ApiError(400,"email, password and username or email are required")
    }
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"user not found")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"invalid email or password")
    }
    const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true,
        
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
       new ApiResponse(
        200,
        {
            user:loggedInUser,
            accessToken,
            refreshToken
        },
        "user logged in successfully"
        )
    )

})
const logoutUser=asyncHandler(async(req,res)=>{
    const userId=req.user._id
    await User.findByIdAndUpdate(userId,{
        $set:{
            refreshToken:undefined
        }},
        {
            new:true

        }
    )
    
    })
    const options={
        httpOnly:true,
        secure:true,
        expires:new Date(Date.now())
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(
            200,
            null,
            "user logged out successfully"
        )
    )



export {
    registerUser,
    loginUser,
    logoutUser
}