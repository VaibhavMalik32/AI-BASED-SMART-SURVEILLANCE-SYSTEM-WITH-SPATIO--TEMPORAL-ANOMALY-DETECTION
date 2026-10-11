# AI-Based Smart Surveillance System with Spatio-Temporal Anomaly Detection

An end-to-end smart surveillance application that lets users upload videos and analyze them for potentially anomalous activity. The project combines a React dashboard, an Express API, MongoDB for video/notification records, Cloudinary for media storage, and a Python deep-learning inference pipeline.

> **Note:** This system is a prototype for research and demonstration. Model predictions can be wrong and should not be treated as definitive evidence of an incident. Any alerts should be reviewed by a person.

## Features

- **Video upload and analysis** through the web dashboard.
- **Spatio-temporal anomaly classification** using a trained PyTorch model that processes sequences of video-frame features.
- **Object-aware frame processing** using YOLOv8 to locate relevant objects before feature extraction.
- **Dashboard views** for uploaded videos, clean videos, and detected anomalies.
- **Video details** including the model's status, confidence, anomaly time (when returned), and a representative frame.
- **Notifications** for video analysis results.
- **Cloud media storage** using Cloudinary.
- **MongoDB persistence** for video metadata and notification records.

## Architecture

```text
React + Vite frontend
        |
        | HTTP requests (VITE_BACKEND_URL)
        v
Express / Node.js backend
        |-- MongoDB (video and notification records)
        |-- Cloudinary (uploaded video and frame assets)
        |
        | launches Python inference script
        v
Python / PyTorch inference pipeline
        |-- YOLOv8 object detection
        |-- EfficientNet-B0 frame features
        |-- Bidirectional GRU + multi-head attention
        v
JSON prediction -> API response -> dashboard
```

### Model pipeline

The inference script in `backend/python/detect.py` samples frames from the uploaded video, uses YOLOv8 to select relevant regions when possible, extracts features with a pretrained EfficientNet-B0, and evaluates temporal feature windows using a trained model with a bidirectional GRU and 8-head multi-head attention. The script returns a JSON result containing the classification status, confidence, and a representative frame path when available.

The current inference configuration uses a sequence length of 64 features, a stride of 32, and samples every 5th source frame. The classification threshold in the script is 0.5. These are implementation settings, not a guarantee of real-world accuracy.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios, Tailwind CSS |
| Backend API | Node.js, Express, Multer |
| Database | MongoDB, Mongoose |
| Media storage | Cloudinary |
| ML inference | Python, PyTorch, Torchvision, timm, OpenCV, Ultralytics YOLO |
| Anomaly model | EfficientNet-B0 feature extraction, bidirectional GRU, multi-head attention |

## Repository Structure

```text
.
├── backend/
│   ├── controllers/       # Video, dashboard, and notification handlers
│   ├── db/                # MongoDB connection
│   ├── middleware/        # Upload handling
│   ├── models/            # Mongoose models
│   ├── routes/            # Express routes
│   ├── utils/             # Cloudinary integration
│   ├── python/
│   │   ├── detect.py      # Video inference pipeline
│   │   ├── final_anomaly_model.pth
│   │   └── requirements.txt
│   ├── app.js
│   ├── index.js
│   ├── package.json
│   └── YOLO weights (.pt)
└── frontend/
    ├── src/
    │   ├── components/    # Dashboard components
    │   ├── services/      # API clients
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## Prerequisites

Install the following before running the application:

- Node.js and npm
- Python 3
- MongoDB (local instance or hosted MongoDB deployment)
- A Cloudinary account for storing uploaded videos and extracted frames
- Enough RAM, disk space, and compute resources to install and run PyTorch, OpenCV, and YOLOv8

## Configuration

Create a `.env` file inside `backend/` (do not commit it):

```dotenv
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# Optional: path to the Python 3 executable used by the backend
PYTHON_EXECUTABLE=python3
```

The backend currently appends `/New_DB` to `MONGODB_URI` when connecting to MongoDB, so configure the variable accordingly. Use valid credentials for your own environment.

Create a `.env` file inside `frontend/`:

```dotenv
VITE_BACKEND_URL=http://localhost:5000
```

Use the actual backend URL and port for your setup. Never commit real API keys, database credentials, or other secrets.

## Run Locally

### 1. Install backend dependencies

In a terminal:

```bash
cd backend
npm install
```

### 2. Set up the Python environment

From the `backend/` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r python/requirements.txt
```

The inference code loads `final_anomaly_model.pth` from `backend/python/` and loads `yolov8n.pt` relative to the backend working directory. Ensure these model weights are present at the expected paths. The pretrained EfficientNet-B0 weights may be downloaded by timm on the first run, depending on the local cache.

If your machine has a suitable CUDA-enabled GPU and compatible PyTorch installation, configure PyTorch accordingly. CPU inference may be slower.

### 3. Configure and start the backend

Make sure MongoDB is running and the backend `.env` file is configured. From the `backend/` directory, start the API:

```bash
node index.js
```

The backend uses `PORT` from the environment. Keep this terminal running.

### 4. Install and start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). Ensure `VITE_BACKEND_URL` points to the running backend. Restart the Vite server after changing frontend environment variables.

## Main API Routes

The Express application currently mounts these routes:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/video/upload` | Upload and analyze a video |
| `GET` | `/video/all` | Retrieve all stored video records |
| `GET` | `/video/:id` | Retrieve a video record by ID |
| `GET` | `/video/dashboard` | Retrieve dashboard statistics |
| `GET` | `/video/anomalies` | Retrieve anomaly records |
| `GET` | `/video/clean` | Retrieve clean-video records |
| `GET` | `/notification` | Retrieve notifications |
| `PATCH` | `/notification/mark-read` | Mark notifications as read |
| `DELETE` | `/notification/:id` | Delete a notification |

All routes are relative to the backend base URL. Confirm the implementation and response format in the route/controller files before building external integrations against them.

## Model and Data Notes

- The repository includes a trained anomaly-model checkpoint and YOLOv8 weights.
- The Python requirements include PyTorch, Torchvision, timm, OpenCV, and Ultralytics.
- Uploaded videos and generated frames are runtime data and are intentionally excluded from source control.
- Only use videos and datasets that you have permission to process and share. Avoid committing private, sensitive, or personally identifying footage.

## Troubleshooting

- **Frontend cannot reach the API:** Verify `VITE_BACKEND_URL`, `PORT`, and `FRONTEND_URL`; restart Vite after environment changes.
- **MongoDB connection errors:** Confirm MongoDB is running and `MONGODB_URI` is compatible with the backend's `/New_DB` suffix.
- **Python fails to start:** Activate the environment and verify the interpreter path; set `PYTHON_EXECUTABLE` if needed.
- **Model file not found:** Run the backend from `backend/` and confirm the checkpoint and YOLO weight paths match those used in `detect.py`.
- **Inference is slow:** Video feature extraction runs over sampled frames and may be CPU-intensive.

## Responsible Use

This project is intended for educational and research use. Surveillance video can contain sensitive personal information. Obtain appropriate permission, apply suitable access controls and retention practices, and require human review before acting on model-generated alerts.

## Author

**Vaibhav Arun Malik**
