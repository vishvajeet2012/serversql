import { getAllTeacherProfiles, getTeacherDashboardData, searchTeachersByName } from "../controlers/teacherProfile";
import { createTestAndNotifyStudents } from "../controlers/testControler";
import { marksController } from "../controlers/marks controler";
import express from "express";
import { authorizeTeacher } from "../middleware/teacherMiddleware";
import { authenticateJWT } from "../middleware/auth";
import { rankController } from '../controlers/rankControler'



const teacherRouter = express.Router();

teacherRouter.get("/getallteacher", getAllTeacherProfiles);
teacherRouter.post("/searchteacher", searchTeachersByName);

////////////////////////////////////create test/////////////////
teacherRouter.post("/createTestAndNotifyStudents", authenticateJWT, authorizeTeacher, createTestAndNotifyStudents);

////////////////////////////////////marks controller routes/////////////////
teacherRouter.post("/marks/updateStudentMarks", authenticateJWT, authorizeTeacher, marksController.updateStudentMarks);
teacherRouter.get("/marks/getMyTestMarks", authenticateJWT, authorizeTeacher, marksController.getMyTestMarks);
teacherRouter.post("/marks/bulkUpdateMarks", authenticateJWT, authorizeTeacher, marksController.bulkUpdateMarks);

// router.get('/test/:test_id', rankController.getTestRanking);

// // Get ranking distribution for pie chart
// router.get('/test/:test_id/distribution', rankController.getRankDistribution);

// // Get all tests with ranking summary
// router.get('/my-tests', rankController.getMyTestsWithRankings);

// // Get student's overall ranking across all tests
// router.get('/student/:student_id/class/:class_id/section/:section_id', rankController.getStudentOverallRanking);




//////////////////rrank   ///////////////////////////
teacherRouter.post('/test/teaceherrank',  authenticateJWT , authorizeTeacher , rankController.getTestRanking);



////// teacher dashboard data /////////////////
teacherRouter.get("/getTeacherDashboardData", authenticateJWT, authorizeTeacher, getTeacherDashboardData);

export default teacherRouter;
