import { getAllTeacherProfiles } from "../controlers/teacherProfile";

import express, { Request, Response } from "express";
const teacherRouter = express.Router();

teacherRouter.get("/getallteacher" , getAllTeacherProfiles)

export default teacherRouter