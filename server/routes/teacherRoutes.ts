import { getAllTeacherProfiles, searchTeachersByName } from "../controlers/teacherProfile";

import express, { Request, Response } from "express";
const teacherRouter = express.Router();

teacherRouter.get("/getallteacher" , getAllTeacherProfiles)
teacherRouter.post("/searchteacher", searchTeachersByName)

export default teacherRouter