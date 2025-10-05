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
import { feedbackController } from "../controlers/feedbackControelr";

import express, { Request, Response } from "express";
import { removePushToken, savePushToken } from "../controlers/pushnotificaiton";
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


userRouter.post("/save-push-token", authenticateJWT, savePushToken);
userRouter.delete("/remove-push-token", authenticateJWT, removePushToken);

///////////////admin dashbord////////////////////////
userRouter.get("/getadminanalytics", authenticate  ,getAdminAnalytics);


////////////////////feedback apis  ////////////////

// Admin creates optional manual feedback after marks approval

userRouter.post("/admin/create", authenticate, feedbackController.createAdminFeedback);
// Teacher creates manual feedback after marks are approved

userRouter.post("/teacher/create", authenticate, feedbackController.createTeacherFeedback);
// Teacher edits auto-generated or own manual feedback anytime

userRouter.post("/edit/feedback_id", authenticate, feedbackController.editFeedback);
// Student replies to any feedback (auto/manual)

userRouter.post("/reply", authenticate, feedbackController.replyToFeedback);
// Get complete feedback thread for specific test + student (conversation view)

userRouter.post("/thread/test_id/student_id", authenticate, feedbackController.getFeedbackThread);
// Student gets all their feedback across all tests

userRouter.get("/my-feedback", authenticate, feedbackController.getMyFeedback);
// Teacher gets all auto-generated feedbacks to review and edit

userRouter.get("/teacher/review", authenticate, feedbackController.getTeacherReviewFeedback);








export default userRouter;
