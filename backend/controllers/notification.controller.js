import { Notification } from "../models/notification.models.js";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification
            .find()
            .sort({ createdAt: -1 });

        res.json(notifications);
    } catch (error) {

        res.status(500).json({
            message: error.message
        });
    }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};