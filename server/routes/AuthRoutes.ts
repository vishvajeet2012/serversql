import express, { Request, Response } from "express";
import { getMe, loginUser, registerUser } from "../controlers/authControler";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";


const router = express.Router();

router.post("/register" , registerUser)
router.post("/login",loginUser )
router.get("/me", authenticateJWT, getMe)

export default router;