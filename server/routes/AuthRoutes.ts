import express, { Request, Response } from "express";
import { getMe, loginUser, registerUser } from "../controlers/authControler";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import { updatePushToken } from "../controlers/token/fcmtoken";
import { removePushToken } from "../controlers/pushnotificaiton";


const router = express.Router();

router.post("/register" , registerUser)
router.post("/login",loginUser )
router.get("/me", authenticateJWT, getMe)
router.post("/update-push-token", authenticateJWT, updatePushToken);
router.post("/remove-push-token", authenticateJWT, removePushToken);

export default router;