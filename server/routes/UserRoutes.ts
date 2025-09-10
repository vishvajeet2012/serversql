import { getAllUserData, manageStudents } from "../controlers/ManageUser";
import { authenticateAdmin } from "../middleware/AdminAuth";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import {  addStudentProfile } from "../controlers/Profiles";
import {createClass} from "../controlers/class"
import {  createSubject } from "../controlers/subjectControler";

import express, { Request, Response } from "express";
const userRouter = express.Router();



userRouter.post("/getrolebaseuser", getAllUserData )
userRouter.post("/manageuser", authenticateAdmin, manageStudents)

userRouter.post("/addStudentProfile",authenticateJWT,addStudentProfile)


userRouter.post("/createSubject" , createSubject)

userRouter.post("/createclass",createClass)
export default userRouter;
