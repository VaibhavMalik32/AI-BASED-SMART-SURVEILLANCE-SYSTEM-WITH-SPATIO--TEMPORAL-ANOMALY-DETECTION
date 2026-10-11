import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express"
const app = express();
app.use(
    cors({
        origin:process.env.FRONTEND_URL,
        credentials:true
    })
);
app.use(express.json())
app.use(express.urlencoded({
    extended:true
}));
app.use(
    "/uploads",
    express.static("uploads")
);
app.use(
    "/frames",
    express.static("uploads/frames")
);
import videoRouter from "./routes/video.routes.js"
import notificationRouter from "./routes/notification.routes.js";

app.use(
    "/notification",
    notificationRouter
);
app.use("/video",videoRouter)

export {app}