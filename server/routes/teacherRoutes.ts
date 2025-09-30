import { getAllTeacherProfiles, getTeacherDashboardData, searchTeachersByName } from "../controlers/teacherProfile";
import { createTestAndNotifyStudents } from "../controlers/testControler";
import { marksController } from "../controlers/marks controler";
import express from "express";
import { authorizeTeacher } from "../middleware/teacherMiddleware";
import { authenticateJWT } from "../middleware/auth";

const teacherRouter = express.Router();

teacherRouter.get("/getallteacher", getAllTeacherProfiles);
teacherRouter.post("/searchteacher", searchTeachersByName);

////////////////////////////////////create test/////////////////
teacherRouter.post("/createTestAndNotifyStudents", authenticateJWT, authorizeTeacher, createTestAndNotifyStudents);

////////////////////////////////////marks controller routes/////////////////
teacherRouter.post("/marks/updateStudentMarks", authenticateJWT, authorizeTeacher, marksController.updateStudentMarks);
teacherRouter.get("/marks/getMyTestMarks", authenticateJWT, authorizeTeacher, marksController.getMyTestMarks);
teacherRouter.post("/marks/bulkUpdateMarks", authenticateJWT, authorizeTeacher, marksController.bulkUpdateMarks);

////// teacher dashboard data /////////////////
teacherRouter.get("/getTeacherDashboardData", authenticateJWT, authorizeTeacher, getTeacherDashboardData);

export default teacherRouter;
