import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// 🔹 Generate tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token");
  }
};

// 🔹 Register User
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  console.log("email:", email);

  if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.coverImages) && req.files.coverImages.length > 0) {
    coverImageLocalPath = req.files.coverImages[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImages = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImages: coverImages?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// 🔹 Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  console.log(email);

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true, // true in production with HTTPS
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
    );
});

// 🔹 Logout User
const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await User.findByIdAndUpdate(
    userId,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
    expires: new Date(Date.now()), // immediately expire cookies
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});
const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const { oldPassword, newPassword } = req.body;
  const user= await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave:false});
  return res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));

})
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {

  const {fullname,email}=req.body;
  if(!fullname && !email){
    throw new ApiError(400, "Fullname or email is required");
  }
  const user=User.findByIdAndUpdate(req.user?._id,{
    $set:{
      fullname,
      email
    }
  },
  {new:true}

).select("-password -refreshToken")

return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
// const { fullname, email, username } = req.body;

  // const user = await User.findById(req.user?._id);
  // if (!user) {
  //   throw new ApiError(404, "User not found");
  // }

  // user.fullname = fullname || user.fullname;
  // user.email = email || user.email;
  // user.username = username ? username.toLowerCase() : user.username;

  // await user.save();

  // return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));

  });

  const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
      throw new ApiError(400, "Failed to upload avatar");
    }
    const user= await User.findByIdAndUpdate(req.user?._id,{
      $set:{
        avatar: avatar.url
      }
    },{new:true}).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
  

  

    // user.avatar = req.body.avatar;
    // await user.save();

    // return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
  });
  const updateUserCover = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path;

    if (!coverLocalPath) {
      throw new ApiError(400, "Cover image is required");
    }

    const cover = await uploadOnCloudinary(coverLocalPath);
    if (!cover.url) {
      throw new ApiError(400, "Failed to upload cover");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        cover: cover.url
      }
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "User cover updated successfully"));
  });
  

export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCover

};
