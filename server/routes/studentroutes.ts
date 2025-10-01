import { getStudentDashboard } from "../controlers/studentDashbord"
import { authenticateJWT } from "../middleware/auth"

const express =require("express")
const router = express.Router()

router.get("/getStudentDashboard", authenticateJWT, getStudentDashboard)

export default router
