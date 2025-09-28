import { getAllTeacherProfiles, getTeacherDashboardData, searchTeachersByName } from "../controlers/teacherProfile";
import { createTestAndNotifyStudents } from "../controlers/testControler";
import express, { Request, Response } from "express";
import { authorizeTeacher } from "../middleware/teacherMiddleware";
import { authenticateJWT } from "../middleware/auth";
const teacherRouter = express.Router();

teacherRouter.get("/getallteacher" , getAllTeacherProfiles)
teacherRouter.post("/searchteacher", searchTeachersByName)

////////////////////////////////////create test/////////////////
teacherRouter.post("/createTestAndNotifyStudents",authenticateJWT,authorizeTeacher,createTestAndNotifyStudents)


////// teacehr dashborad data /////////////////
teacherRouter.get("/getTeacherDashboardData" ,authenticateJWT,authorizeTeacher, getTeacherDashboardData)

export default teacherRouter