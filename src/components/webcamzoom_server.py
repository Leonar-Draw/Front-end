import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import uvicorn

# 줌 웹캠 시작
@asynccontextmanager
async def lifespan(app: FastAPI):
    global cap
    cap = cv2.VideoCapture(0)
    print("웹캠이 정상적으로 열렸습니다.")
    yield
    cap.release()
    print("웹캠 종료 완료!")

app = FastAPI(lifespan=lifespan)

def generate_frames():
    # 얼굴 및 눈 검출용 Haar Cascade 초기화
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    while True:
        success, frame = cap.read()
        if not success:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # 얼굴 검출
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        
        if len(faces) > 0:
            # 가장 큰 얼굴 영역 선택
            face = max(faces, key=lambda r: r[2] * r[3])
            fx, fy, fw, fh = face
            face_roi = gray[fy:fy+fh, fx:fx+fw]
            
            # 얼굴 영역 내에서 눈 검출
            eyes = eye_cascade.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=10, minSize=(30, 30))
            
            if len(eyes) > 0:
                # 눈들을 모두 포함하는 바운딩 박스 계산 (얼굴 내부 좌표)
                ex_min = min(x for (x, y, w, h) in eyes)
                ey_min = min(y for (x, y, w, h) in eyes)
                ex_max = max(x + w for (x, y, w, h) in eyes)
                ey_max = max(y + h for (x, y, w, h) in eyes)
                
                # 얼굴 내부 좌표를 전체 이미지 좌표로 변환
                x_min = fx + ex_min
                y_min = fy + ey_min
                x_max = fx + ex_max
                y_max = fy + ey_max
                
                # 여유 공간(margin) 추가 (20% 여유)
                margin_x = int((x_max - x_min) * 0.2)
                margin_y = int((y_max - y_min) * 0.2)
                x_min = max(x_min - margin_x, 0)
                y_min = max(y_min - margin_y, 0)
                x_max = min(x_max + margin_x, frame.shape[1])
                y_max = min(y_max + margin_y, frame.shape[0])
                
                # 눈 영역만 잘라내어 사용
                cropped = frame[y_min:y_max, x_min:x_max]
                # 눈 영역을 전체 프레임 크기에 맞게 리사이즈 (눈만 확대 표시)
                frame = cv2.resize(cropped, (frame.shape[1], frame.shape[0]))
            else:
                # 얼굴은 검출되었으나 눈이 검출되지 않으면 검은 화면에 메시지 표시
                frame = np.zeros_like(frame)
                cv2.putText(frame, "No eyes detected", (10, frame.shape[0] // 2),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        else:
            # 얼굴이 검출되지 않은 경우 검은 배경에 메시지 표시
            frame = np.zeros_like(frame)
            cv2.putText(frame, "No face detected", (10, frame.shape[0] // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # JPEG 인코딩 후 프레임 스트리밍
        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/")
def home():
    return {"message": "FastAPI Webcam Streaming Server is Running!"}

@app.get("/video")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    uvicorn.run("webcamcamcam:app", host="0.0.0.0", port=8000, reload=True)
