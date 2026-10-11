import os
import sys
import json
import cv2
import torch
import numpy as np
import timm
from torchvision import transforms
from ultralytics import YOLO
import torch.nn as nn
import logging

logging.getLogger("ultralytics").setLevel(logging.ERROR)
os.environ["YOLO_VERBOSE"] = "False"

VIDEO_PATH = sys.argv[1]

# ── MUST match Colab notebook exactly ─────────────────────
SEQUENCE_LENGTH = 64
STRIDE = 32
FRAME_SKIP = 5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "./python/final_anomaly_model.pth"


class AnomalyDetectionModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.bigru = nn.GRU(
            input_size=1280,
            hidden_size=192,
            batch_first=True,
            bidirectional=True
        )
        self.attention = nn.MultiheadAttention(
            embed_dim=384,
            num_heads=8,
            batch_first=True
        )
        self.dropout = nn.Dropout(0.5)
        self.fc1 = nn.Linear(384, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(128, 1)

    def forward(self, x):
        if self.training:
            noise = torch.randn_like(x) * 0.01
            x = x + noise

        gru_out, _ = self.bigru(x)
        attended, attention_weights = self.attention(gru_out, gru_out, gru_out)
        attention_vector, _ = attended.max(dim=1)
        residual_vector, _ = gru_out.max(dim=1)
        fused = attention_vector + residual_vector
        fused = self.dropout(fused)
        fused = self.fc1(fused)
        fused = self.bn1(fused)
        fused = self.relu(fused)
        fused = self.dropout(fused)
        logits = self.fc2(fused)
        return logits, attention_weights


# ── Load models ────────────────────────────────────────────
yolo_model = YOLO("yolov8n.pt")

efficientnet = timm.create_model(
    "efficientnet_b0",
    pretrained=True,
    num_classes=0
)
efficientnet.eval()
efficientnet = efficientnet.to(DEVICE)

model = AnomalyDetectionModel()
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()

transform = transforms.Compose([

    transforms.ToPILImage(),

    transforms.Resize((224,224)),

    transforms.ToTensor(),

    transforms.Normalize(

        mean=[0.485,0.456,0.406],

        std=[0.229,0.224,0.225]

    )

])

TARGET_CLASSES = [0, 1, 2, 3, 5, 7]  # person, bicycle, car, motorcycle, bus, truck


# ── Helpers ───────────────────────────────────────────────
def save_frame(video_path, frame_idx=0, annotated_frame=None):
    os.makedirs("uploads/frames", exist_ok=True)
    video_name = os.path.splitext(os.path.basename(video_path))[0]
    saved_path = f"uploads/frames/{video_name}.jpg"
    url_path = f"/uploads/frames/{video_name}.jpg"

    if annotated_frame is not None:
        cv2.imwrite(saved_path, annotated_frame)
        return url_path

    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    cap.release()
    if ret:
        cv2.imwrite(saved_path, frame)
        return url_path
    return None


def extract_roi(frame):
    results = yolo_model(frame, verbose=False)
    best_score = 0
    best_roi = None
    for box in results[0].boxes:
        cls = int(box.cls.cpu().numpy().item())
        if cls not in TARGET_CLASSES:
            continue
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        if x2<=x1 or y2<=y1:
                continue
        x1=max(0,x1)
        y1=max(0,y1)
        x2=min(frame.shape[1],x2)
        y2=min(frame.shape[0],y2)
        area = (x2 - x1) * (y2 - y1)
        score = area * float(box.conf.item())
        if score > best_score:
            best_score = score
            best_roi = frame[y1:y2, x1:x2]
    return best_roi if best_roi is not None else frame


def get_feature(frame):
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame = transform(frame).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        feature = efficientnet(frame)
    return feature.squeeze().cpu().numpy()


def extract_video_features(video_path):
    cap = cv2.VideoCapture(video_path)
    features = []
    frame_idx = 0
    processed = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % FRAME_SKIP == 0:
            roi = extract_roi(frame)
            feature = get_feature(roi)
            features.append(feature)
            processed += 1
            if processed % 50 == 0:
                print(f"Processed {processed} feature frames...", file=sys.stderr)
        frame_idx += 1
    cap.release()
    return np.array(features)

def find_anomaly_object(frame, conf=0.05):

    results = yolo_model(
        frame,
        conf=0.15,
        imgsz=640,
        verbose=False
    )[0]

    best_box = None
    best_score = -1

    print(results.boxes.cls.cpu().numpy(), file=sys.stderr)

    for box in results.boxes:

        cls = int(box.cls.item())

        print(
            results.names[cls],
            float(box.conf.item()),
            file=sys.stderr
        )

        if cls not in TARGET_CLASSES:
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        area = (x2 - x1) * (y2 - y1)

        print(
            "Area:",
            area,
            file=sys.stderr
        )

        # Ignore tiny detections
        if area < 20:
            continue

        if cls == 0:
            score = area * (1 + float(box.conf.item()))
        else:
            score = area * float(box.conf.item())

        if score > best_score:
            best_score = score
            best_box = box

    if best_box is not None:

        print(
            "SELECTED:",
            results.names[int(best_box.cls.item())],
            float(best_box.conf.item()),
            file=sys.stderr
        )

    else:

        print(
            "No TARGET object selected",
            file=sys.stderr
        )

    return best_box, results

# ── Read real video fps/frame count ───────────────────────
cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
cap.release()
if fps <= 0 or fps != fps:
    fps = 25

video_duration = total_frames / fps
effective_fps = fps / FRAME_SKIP

print(f"Video FPS: {fps}", file=sys.stderr)
print(f"Effective FPS (after FRAME_SKIP): {effective_fps}", file=sys.stderr)
print(f"Total Frames: {total_frames}", file=sys.stderr)
print(f"Video Duration: {video_duration:.2f}s", file=sys.stderr)

# ── Extract features ──────────────────────────────────────
features = extract_video_features(VIDEO_PATH)
print(f"Extracted feature frames: {len(features)}", file=sys.stderr)

# ── Too short to analyze → clean ─────────────────────────
if len(features) < SEQUENCE_LENGTH:
    frame_path = save_frame(VIDEO_PATH, frame_idx=0)
    result = {
        "status": "clean",
        "time": None,
        "confidence": 100,
        "frame": frame_path
    }
    print(json.dumps(result))
    sys.exit()

# ── Build coarse sequences with STRIDE (matches training) ──
sequences = []
start_indices = []

for start in range(0, len(features) - SEQUENCE_LENGTH + 1, STRIDE):
    seq = features[start:start + SEQUENCE_LENGTH]
    sequences.append(seq)
    start_indices.append(start)

print(f"Total Sequences: {len(sequences)}", file=sys.stderr)

if len(sequences) == 0:
    frame_path = save_frame(VIDEO_PATH, frame_idx=0)
    result = {
        "status": "clean",
        "time": None,
        "confidence": 100,
        "frame": frame_path
    }
    print(json.dumps(result))
    sys.exit()

all_scores = []

with torch.no_grad():
    for seq in sequences:
        x = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        logits, _ = model(x)
        score = torch.sigmoid(logits).item()
        all_scores.append(score)

all_scores = np.array(all_scores)
max_score = float(np.max(all_scores))
best_window = int(np.argmax(all_scores))

THRESHOLD = 0.5

anomaly_confidence = max(0, min(100, round(max_score * 100, 2)))
clean_confidence = max(0, min(100, round((1 - max_score) * 100, 2)))

window_start = start_indices[best_window]
window_end_time = min((window_start + SEQUENCE_LENGTH - 1) / effective_fps, video_duration)
window_start_time = window_start / effective_fps

print(f"Best Window: {best_window} (start_idx={window_start})", file=sys.stderr)
print(f"Max Score: {max_score:.4f}", file=sys.stderr)
print(f"Window time range: {window_start_time:.2f}s - {window_end_time:.2f}s", file=sys.stderr)

with torch.no_grad():

    seq = features[
        window_start :
        window_start + SEQUENCE_LENGTH
    ]

    x = torch.tensor(
        seq,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)

    _, attention = model(x)

attention = attention.cpu().numpy().squeeze(0)

print(f"Attention shape: {attention.shape}", file=sys.stderr)

# Use the center of the anomalous window
cap = cv2.VideoCapture(VIDEO_PATH)

frame_candidates = []

for local_idx in range(SEQUENCE_LENGTH):

    global_idx = window_start + local_idx

    frame_number = global_idx * FRAME_SKIP

    if frame_number >= total_frames:
        continue

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)

    ret, frame = cap.read()

    if not ret:
        continue

    results = yolo_model(frame, verbose=False)[0]

    total_conf = 0

    for box in results.boxes:

        cls = int(box.cls.item())

        if cls in TARGET_CLASSES:

            total_conf += float(box.conf.item())

    frame_candidates.append(
        (
            local_idx,
            global_idx,
            frame_number,
            total_conf
        )
    )

cap.release()

frame_candidates.sort(
    key=lambda x: x[3],
    reverse=True
)

best_local_idx, global_idx, actual_frame, _ = frame_candidates[0]

anomaly_time = actual_frame / fps


# ── Anomaly branch ────────────────────────────────────────
frame_path = None

if max_score > THRESHOLD:
    cap = cv2.VideoCapture(VIDEO_PATH)
    cap.set(cv2.CAP_PROP_POS_FRAMES, actual_frame)
    ret, frame = cap.read()
    cap.release()

    if ret:
        best_box, results = find_anomaly_object(frame, conf=0.05)
        print(
            f"YOLO detections: {len(results.boxes)}",
            file=sys.stderr
        )

        # If nothing found on the exact frame, search a few frames around it
        if best_box is None:
            # search_offsets = [-10, -5, 5, 10, -15, 15]
            search_offsets = [0, -5, 5, -10, 10, -15, 15]
            best_probe_score = 0
            for offset in search_offsets:
                probe_frame_idx = actual_frame + offset
                if probe_frame_idx < 0 or probe_frame_idx >= total_frames:
                    continue
                cap = cv2.VideoCapture(VIDEO_PATH)
                cap.set(cv2.CAP_PROP_POS_FRAMES, probe_frame_idx)
                ret2, probe_frame = cap.read()
                cap.release()
                if not ret2:
                    continue
                probe_box, probe_results = find_anomaly_object(probe_frame, conf=0.05)
                if probe_box is not None:
                    probe_cls = int(probe_box.cls.item())

                    if probe_cls == 0:
                        score = 100 + float(probe_box.conf.item())
                    else:
                        score = float(probe_box.conf.item())
                    if score > best_probe_score:
                        actual_frame = probe_frame_idx
                        anomaly_time = actual_frame / fps
                        best_probe_score = score
                        best_box = probe_box
                        results = probe_results
                        frame = probe_frame
                        print(f"Found object at offset {offset} frames", file=sys.stderr)


        if best_box is not None:

            cls = int(best_box.cls.item())

            x1, y1, x2, y2 = map(int, best_box.xyxy[0])

            conf = float(best_box.conf.item())
            print(
                "Drawing rectangle:",
                x1, y1, x2, y2,
                file=sys.stderr
            )
            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 0, 255),
                3
            )

            cv2.putText(
                frame,
                f"{results.names[cls]} {conf:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )

        else:

            print(
                "No YOLO detection found in TARGET_CLASSES",
                file=sys.stderr
            )

        cv2.putText(frame, f"Anomaly: {anomaly_confidence:.1f}%",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        frame_path = save_frame(VIDEO_PATH, annotated_frame=frame)

    print(f"Frame Path: {frame_path}", file=sys.stderr)

    result = {
        "status": "anomaly",
        "time": f"{anomaly_time:.2f} sec",
        "time_range": f"{window_start_time:.1f}s - {window_end_time:.1f}s",
        "confidence": float(anomaly_confidence),
        "frame": frame_path,
        "frame_number": int(actual_frame),
        "window": int(best_window),
        "threshold": float(THRESHOLD)
    }

# ── Clean branch ──────────────────────────────────────────
else:
    frame_path = save_frame(VIDEO_PATH, frame_idx=total_frames//2)
    print(f"Frame Path: {frame_path}", file=sys.stderr)

    result = {
        "status":"clean",
        "time":None,
        "confidence":float(clean_confidence),
        "frame":frame_path,
        "threshold":float(THRESHOLD)
    }

print(json.dumps(result))