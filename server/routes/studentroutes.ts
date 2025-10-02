import { getStudentAnalytics, getStudentDashboard } from "../controlers/studentDashbord"
import { authenticateJWT } from "../middleware/auth"

const express =require("express")
const router = express.Router()

router.get("/getStudentDashboard", authenticateJWT, getStudentDashboard)
router.get("/getStudentAnalytics", authenticateJWT, getStudentAnalytics)

export default router
