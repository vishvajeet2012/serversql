import { getAllUserData  ,addUserByAdmin, manageStudents,} from "../controlers/ManageUser";
import { authenticateJWT  ,DecodedToken} from "../middleware/AdminAuth";
import {  addStudentProfile } from "../controlers/Profiles";
import {createClass, getAllClassbysection, searchClassBySectionWithQuery} from "../controlers/class"
import {  createSubject } from "../controlers/subjectControler";
import { getAllTeacherProfiles } from "../controlers/teacherProfile";
import { getSectionDetails} from "../controlers/Sections"
import express, { Request, Response } from "express";
const userRouter = express.Router();


/////// manage user ///////////////////////
userRouter.post("/getrolebaseuser", getAllUserData )
userRouter.post("/manageuser", manageStudents)
userRouter.post("/addUserByAdmin", addUserByAdmin)
userRouter.post("/addStudentProfile",addStudentProfile)

///////////////classes section  prisma done  /////////////////
userRouter.get("/getAllClassbysection",getAllClassbysection)
userRouter.post("/searchClassBySectionWithQuery",searchClassBySectionWithQuery)

//////////////////section //////////////////
userRouter.post("/getsectiondetails" ,getSectionDetails)


userRouter.post("/createSubject" , createSubject)

userRouter.post("/createclass",createClass)
export default userRouter;
