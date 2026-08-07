import os
import uuid
import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Circuit Forge — LPR Server", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CONFIDENCE_THRESHOLD = 50.0  # Only send to backend if above this

# Configure tesseract path (adjust for your system)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# On Linux: pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

SA_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

def detect_plate(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 50, 150)
    edged = cv2.dilate(edged, None, iterations=1)
    edged = cv2.erode(edged, None, iterations=1)

    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect = w / h
            if 1.5 <= aspect <= 6.0:
                return approx, x, y, w, h
    return None, 0, 0, 0, 0

def extract_plate_region(gray, x, y, w, h):
    margin = 5
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = min(gray.shape[1] - x, w + margin * 2)
    h = min(gray.shape[0] - y, h + margin * 2)
    return gray[y:y+h, x:x+w]

def ocr_plate(plate_roi):
    _, thresh1 = cv2.threshold(plate_roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh2 = cv2.adaptiveThreshold(plate_roi, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    thresh = cv2.bitwise_and(thresh1, thresh2) if thresh1.shape == thresh2.shape else thresh1

    custom_config = '--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    text = pytesseract.image_to_string(thresh, config=custom_config)
    cleaned = ''.join(c for c in text.strip().upper() if c in SA_CHARS)

    data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
    confs = [int(c) for c in data['conf'] if c != '-1']
    avg_conf = float(np.mean(confs)) if confs else 0.0

    return cleaned, round(avg_conf, 1)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "LPR Server", "version": "1.0.0"}

@app.post("/api/detect")
async def detect(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Only JPEG/PNG supported")

    ext = file.filename.split('.')[-1]
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.{ext}")
    with open(path, "wb") as f:
        f.write(await file.read())

    img = cv2.imread(path)
    if img is None:
        return JSONResponse({"success": False, "message": "Invalid image"})

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    plate_contour, x, y, w, h = detect_plate(img)

    if plate_contour is None:
        return JSONResponse({
            "success": False,
            "message": "No plate detected",
            "plate_text": "",
            "confidence": 0.0,
            "above_threshold": False
        })

    plate_roi = extract_plate_region(gray, x, y, w, h)
    plate_text, confidence = ocr_plate(plate_roi)

    above_threshold = confidence >= CONFIDENCE_THRESHOLD

    # Annotate image with highlight only if above threshold
    if above_threshold:
        cv2.drawContours(img, [plate_contour], -1, (0, 255, 0), 3)
        label = plate_text if plate_text else "NO READ"
        cv2.putText(img, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        annotated_path = path.replace('.', '_annotated.')
        cv2.imwrite(annotated_path, img)
    else:
        cv2.drawContours(img, [plate_contour], -1, (0, 0, 255), 2)
        cv2.putText(img, "LOW CONFIDENCE", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        annotated_path = path.replace('.', '_lowconf.')
        cv2.imwrite(annotated_path, img)

    return {
        "success": above_threshold,
        "above_threshold": above_threshold,
        "plate_text": plate_text,
        "confidence": confidence,
        "char_count": len(plate_text),
        "coordinates": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
        "annotated_image": annotated_path,
        "message": "Plate detected with high confidence" if above_threshold else "Low confidence — not stored"
    }

@app.post("/api/detect-force")
async def detect_force(file: UploadFile = File(...)):
    """Same as detect but always stores regardless of confidence (for testing)"""
    return await detect(file)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
