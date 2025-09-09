import { getAllUserData, manageStudents } from "../controlers/ManageUser";
import { authenticateAdmin } from "../middleware/AdminAuth";

import express, { Request, Response } from "express";
const userRouter = express.Router();



userRouter.post("/getrolebaseuser", getAllUserData )
userRouter.post("/manageuser", authenticateAdmin, manageStudents)

export default userRouter;
