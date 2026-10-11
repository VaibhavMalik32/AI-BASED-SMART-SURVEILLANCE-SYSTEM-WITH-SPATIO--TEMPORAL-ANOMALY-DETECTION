import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {createBrowserRouter,RouterProvider} from "react-router-dom"
import TotalVideos from '../components/TotalVideos/TotalVideos.jsx'
import AnomalyVideos from '../components/AnomalyVideos/AnomalyVideos.jsx'
import CleanVideos from '../components/CleanVideos/CleanVideos.jsx'
import App from './App.jsx'
import VideoDetails from "../components/pages/VideoDetails.jsx";

const router = createBrowserRouter([
  {
    path:"/",
    element:<App/>
  },
  {
    path:"/videos",
    element:<TotalVideos/>
  },
  {
    path:"/anomalies",
    element:<AnomalyVideos/>
  },
  {
    path:"/clean",
    element:<CleanVideos/>
  },
  {
    path:"/video/:id",  
    element:<VideoDetails/>
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
