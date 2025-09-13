import { Router } from "express";
import { loginUser, registerUser,logoutUser, generateAccessAndRefreshToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCover, getUserChannelProfile, getWatchHistory } from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { verify } from "jsonwebtoken";
const router=Router()


router.route("/register").post(
    
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImages", maxCount: 1 }
    ]),
    registerUser
)
router.route("/login").post(loginUser)


//secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(generateAccessAndRefreshToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover").patch(verifyJWT,upload.single("cover"),updateUserCover )
router.route("/c/:username").get(verifyJWT,getUserChannelProfile  )
router.route("/watch-history").get(verifyJWT,getWatchHistory )
export default router