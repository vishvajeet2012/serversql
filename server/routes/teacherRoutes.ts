import { getAllTeacherProfiles, getTeacherDashboardData, searchTeachersByName } from "../controlers/teacherProfile";

import express, { Request, Response } from "express";
import { authorizeTeacher } from "../middleware/teacherMiddleware";
import { authenticateJWT } from "../middleware/auth";
const teacherRouter = express.Router();

teacherRouter.get("/getallteacher" , getAllTeacherProfiles)
teacherRouter.post("/searchteacher", searchTeachersByName)


////// teacehr dashborad data /////////////////
teacherRouter.get("/getTeacherDashboardData" ,authenticateJWT,authorizeTeacher, getTeacherDashboardData)

export default teacherRouter