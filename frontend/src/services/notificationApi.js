import axios from "axios";
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const getNotifications = async () => {
    const response = await axios.get(
        `${BASE_URL}/notification`
    );
    return response.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axios.patch(`${BASE_URL}/notification/mark-read`);
  return res.data;
};

export const deleteNotification = async (id) => {
  const res = await axios.delete(`${BASE_URL}/notification/${id}`);
  return res.data;
};