import { getAllUserData  ,addUserByAdmin, manageStudents,} from "../controlers/ManageUser";
import { authenticateJWT  ,DecodedToken} from "../middleware/AdminAuth";
import {  addStudentProfile } from "../controlers/Profiles";
import {createClass, getAllClassbysection, searchClassBySectionWithQuery} from "../controlers/class"
import {  createSubject, getSubjectByName } from "../controlers/subjectControler";
import { getAllTeacherProfiles } from "../controlers/teacherProfile";
import { getSectionDetails, SectionTeachersController} from "../controlers/Sections"
import {getTotals } from "../controlers/overVIewControler"
import { adminMarksController } from "../controlers/adminMarksController";
import { authenticateJWT as authenticate } from "../middleware/auth";
import  {getAdminAnalytics} from "../controlers/admindashbord"

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
userRouter.post("/addsectionteacher" , SectionTeachersController.addSectionTeacher)

//////////////////// subject/ //////////////////   
userRouter.post("/createSubject" , createSubject)
userRouter.post('/searchsubject' ,getSubjectByName)

userRouter.post("/createclass",createClass)


///////// overViews /////////////////
userRouter.get("/gettotals",getTotals )

///////// admin marks management /////////////////
userRouter.post("/approveMarks", authenticate, authenticateJWT, adminMarksController.approveMarks);
userRouter.post("/rejectMarks", authenticate, authenticateJWT ,adminMarksController.rejectMarks);
userRouter.get("/getAllMarks", adminMarksController.getAllMarks);
userRouter.get("/getPendingMarks", adminMarksController.getPendingMarks);
userRouter.post("/bulkApproveMarks", authenticate, authenticateJWT, adminMarksController.bulkApproveMarks);




///////////////admin dashbord////////////////////////
userRouter.get("/getadminanalytics", authenticate  ,getAdminAnalytics);










export default userRouter;
