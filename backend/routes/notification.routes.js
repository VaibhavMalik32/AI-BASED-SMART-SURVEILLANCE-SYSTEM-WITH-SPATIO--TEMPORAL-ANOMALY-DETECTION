import express from "express";

import {
    getNotifications,markAllNotificationsRead,deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get(
    "/",
    getNotifications
);
router.patch("/mark-read", markAllNotificationsRead);
router.delete("/:id", deleteNotification);

export default router;