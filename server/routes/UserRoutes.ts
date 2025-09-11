import { getAllUserData, manageStudents ,addUserByAdmin} from "../controlers/ManageUser";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import {  addStudentProfile } from "../controlers/Profiles";
import {createClass} from "../controlers/class"
import {  createSubject } from "../controlers/subjectControler";

import express, { Request, Response } from "express";
const userRouter = express.Router();


/////// manage user ///////////////////////
userRouter.post("/getrolebaseuser", getAllUserData )
userRouter.post("/manageuser", manageStudents)
userRouter.post("/addUserByAdmin",authenticateJWT, addUserByAdmin)
userRouter.post("/addStudentProfile",authenticateJWT,addStudentProfile)


userRouter.post("/createSubject" , createSubject)

userRouter.post("/createclass",createClass)
export default userRouter;
