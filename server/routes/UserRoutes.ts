import { getAllUserData, manageStudents ,addUserByAdmin} from "../controlers/ManageUser";
import { authenticateJWT  ,DecodedToken} from "../middleware/AdminAuth";
import {  addStudentProfile } from "../controlers/Profiles";
import {createClass, getAllClassbysection, searchClassBySectionWithQuery} from "../controlers/class"
import {  createSubject } from "../controlers/subjectControler";
import { getAllTeacherProfiles } from "../controlers/teacherProfile";

import express, { Request, Response } from "express";
const userRouter = express.Router();


/////// manage user ///////////////////////
userRouter.post("/getrolebaseuser", getAllUserData )
userRouter.post("/manageuser", manageStudents)
userRouter.post("/addUserByAdmin",authenticateJWT, addUserByAdmin)
userRouter.post("/addStudentProfile",authenticateJWT,addStudentProfile)

///////////////classes section  prisma done  /////////////////
userRouter.get("/getAllClassbysection",getAllClassbysection)
userRouter.post("/searchClassBySectionWithQuery",searchClassBySectionWithQuery)




userRouter.post("/createSubject" , createSubject)

userRouter.post("/createclass",createClass)
export default userRouter;
