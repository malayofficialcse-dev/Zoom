import { Router } from "express";
import { addToHistory, getScheduledMeetings, getUserAnalytics, getUserHistory, login, register, scheduleMeeting } from "../controllers/user.controller.js";



const router = Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)
router.route("/get_analytics").get(getUserAnalytics)
router.route("/schedule").post(scheduleMeeting)
router.route("/get_scheduled").get(getScheduledMeetings)

export default router;