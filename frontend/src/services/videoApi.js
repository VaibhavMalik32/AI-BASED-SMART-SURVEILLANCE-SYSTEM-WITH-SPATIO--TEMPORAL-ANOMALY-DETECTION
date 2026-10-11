import axios from "axios";
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

const API = axios.create({
    baseURL: `${BASE_URL}/video`
});

export const uploadVideo = async(file)=>{

    const formData = new FormData();

    formData.append(
        "video",
        file
    );

    const res = await API.post(
        "/upload",
        formData,
        {
            headers:{
                "Content-Type":
                "multipart/form-data"
            }
        }
    );

    return res.data;
};

export const getDashboardStats = async()=>{

    const res = await API.get(
        "/dashboard"
    );

    return res.data;
};

export const getAllVideos = async () => {
    const res = await API.get(
        "/all"
    )
    return res.data;
}
