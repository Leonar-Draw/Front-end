import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from './Button';
import styles from './SubStep.module.css';
import { Icon } from '@iconify/react';
import arrowLeft from '@iconify-icons/mdi/arrow-left';

const SubStep = () => {
  const { id, subId } = useParams();
  const navigate = useNavigate();

  // Step별 선 두께 설정:
  // step1: 선 두께 40, 매칭 영역 반지름 = 40/2 = 20
  // step2,3: 선 두께 5, 매칭 영역 = 5픽셀 그대로 인식
  const isStep1 = parseInt(id) === 1;
  const lineThickness = isStep1 ? 40 : 5;
  const matchThickness = isStep1 ? lineThickness / 2 : lineThickness; 

  // 캔버스 ref (maskCanvas는 제거)
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [userPath, setUserPath] = useState([]); // 그린 점들을 누적
  const [message, setMessage] = useState("🎨 그림을 그려보세요!");
  const [progress, setProgress] = useState(0); // 현재 진행률 (%)
  const [templateData, setTemplateData] = useState(null);
  const [totalTemplatePixels, setTotalTemplatePixels] = useState(1);

  // PNG 이미지 경로
  const getStepImage = () => `/images/${id}step/${subId}.png`;

  useEffect(() => {
    drawTemplate();
  }, [id, subId]);

  const drawTemplate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imgSrc = getStepImage();
    if (imgSrc) {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        // offscreen canvas로 템플릿 처리
        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext("2d");
        offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
        const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const data = imageData.data;
        // 검은색(또는 어두운) 픽셀을 회색(150,150,150)으로 변환
        for (let i = 0; i < data.length; i += 4) {
          if (
            data[i + 3] > 0 &&
            data[i] < 100 &&
            data[i + 1] < 100 &&
            data[i + 2] < 100
          ) {
            data[i] = 150;
            data[i + 1] = 150;
            data[i + 2] = 150;
          }
        }
        offCtx.putImageData(imageData, 0, 0);
        // 템플릿 그리기
        ctx.drawImage(offCanvas, 0, 0);
        // 템플릿 데이터 저장 (진행률 계산용)
        const processedTemplate = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        setTemplateData(processedTemplate);
        // 회색 픽셀 수 계산 (조건: r, g, b가 50~200)
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r >= 50 && r <= 200 && g >= 50 && g <= 200 && b >= 50 && b <= 200) {
            count++;
          }
        }
        console.log("총 회색 픽셀 수:", count);
        setTotalTemplatePixels(count);

        // 저장된 그리기 데이터(userPath)가 있다면 불러와서 재그리기
        const savedUserPath = localStorage.getItem(`drawing-step-${id}-${subId}`);
        if (savedUserPath) {
          try {
            const parsedPath = JSON.parse(savedUserPath);
            if (parsedPath && parsedPath.length > 0) {
              ctx.lineWidth = lineThickness;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = "#000000";
              ctx.beginPath();
              ctx.moveTo(parsedPath[0].x, parsedPath[0].y);
              for (let i = 1; i < parsedPath.length; i++) {
                ctx.lineTo(parsedPath[i].x, parsedPath[i].y);
              }
              ctx.stroke();
              setUserPath(parsedPath);
              const perc = computeMatchPercentage(parsedPath);
              setProgress(perc);
              setMessage(`✅ ${perc.toFixed(1)}% 정확도`);
            }
          } catch (e) {
            console.error("저장된 그림 데이터를 불러오는 중 에러 발생:", e);
          }
        } else {
          // 저장된 데이터가 없으면 progress 0으로 설정
          setProgress(0);
        }
      };
    }
  };

  // Clear 버튼: 저장된 데이터 삭제 및 진행률 0 업데이트
  const clearCanvas = () => {
    drawTemplate();
    setUserPath([]);
    localStorage.removeItem(`drawing-step-${id}-${subId}`);
    localStorage.setItem(`step-${id}-${subId}`, "0");
    setProgress(0);
    setMessage("🎨 그림을 그려보세요!");
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    setDrawing(true);
    setMessage("🖌️ 그리는 중...");
    const ctx = ctxRef.current;
    ctx.lineWidth = lineThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // 진행률 계산: 매칭 영역 두께(matchThickness)를 반영
  const computeMatchPercentage = (path) => {
    if (!templateData || totalTemplatePixels === 0) return 0;
    const width = templateData.width;
    const imgData = templateData.data;
    const matchedPixelSet = new Set();

    const checkIfPixelIsGray = (pixelIndex) => {
      const r = imgData[pixelIndex];
      const g = imgData[pixelIndex + 1];
      const b = imgData[pixelIndex + 2];
      return r >= 50 && r <= 200 && g >= 50 && g <= 200 && b >= 50 && b <= 200;
    };

    path.forEach(({ x, y }) => {
      for (let dy = -matchThickness; dy <= matchThickness; dy++) {
        for (let dx = -matchThickness; dx <= matchThickness; dx++) {
          if (dx * dx + dy * dy <= matchThickness * matchThickness) {
            const checkX = Math.round(x + dx);
            const checkY = Math.round(y + dy);
            if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= templateData.height)
              continue;
            const pixelIndex = (checkY * width + checkX) * 4;
            if (checkIfPixelIsGray(pixelIndex)) {
              matchedPixelSet.add(checkY * width + checkX);
            }
          }
        }
      }
    });
    const matchCount = matchedPixelSet.size;
    console.log(`현재 칠한 픽셀: ${matchCount} / 총 회색 픽셀: ${totalTemplatePixels}`);
    const perc = (matchCount / totalTemplatePixels) * 100;
    return perc;
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    const { x, y } = getMousePos(e);
    setUserPath((prevPath) => {
      const newPath = [...prevPath, { x, y }];
      const perc = computeMatchPercentage(newPath);
      setProgress(perc);
      setMessage(`✅ 진행률: ${perc.toFixed(1)}%`);
      return newPath;
    });
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();
    setUserPath((prevPath) => {
      const perc = computeMatchPercentage(prevPath);
      localStorage.setItem(`drawing-step-${id}-${subId}`, JSON.stringify(prevPath));
      localStorage.setItem(`step-${id}-${subId}`, perc.toFixed(1));
      setProgress(perc);
      if (perc >= 70) {
        setMessage(`🎉 성공적으로 그렸습니다! (${perc.toFixed(1)}%)`);
      } else {
        setMessage(`❌ 다시 시도하세요! / 진행률: ${perc.toFixed(1)}%`);
      }
      return prevPath;
    });
  };

  // 캔버스를 PNG 파일로 저장하는 함수
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `canvas-step-${id}-${subId}.png`;
    link.click();
  };

  const handlePrevStep = () => {
    const currentStep = parseInt(id);
    const currentSubStep = parseInt(subId);
    if (currentSubStep === 1) {
      if (currentStep > 1) {
        navigate(`/step/${currentStep - 1}/12`);
      }
    } else {
      navigate(`/step/${currentStep}/${currentSubStep - 1}`);
    }
  };

  const handleNextStep = () => {
    const currentStep = parseInt(id);
    const currentSubStep = parseInt(subId);
    if (currentSubStep === 12) {
      if (currentStep < 3) {
        navigate(`/step/${currentStep + 1}/1`);
      }
    } else {
      navigate(`/step/${currentStep}/${currentSubStep + 1}`);
    }
  };

  return (
    <div className={styles.subStepContainer}>
      <h2 className={styles.subStepTitle}>
        Step {id} - {subId}
      </h2>
      <div className={styles.mainArea}>
        <div className={styles.canvasWrapper}>
          <button className={styles.backButton} onClick={() => navigate(`/step/${id}`)}>
            <Icon icon={arrowLeft} width="30" height="30" />
          </button>
          <button className={styles.clearButton} onClick={clearCanvas}>
            초기화
          </button>
          {/* 메인 캔버스 */}
          <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            width={1000}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseEnter={() =>
              (canvasRef.current.style.cursor = "url('/images/brush handwriting.cur'), auto")
            }
            onMouseLeave={() => (canvasRef.current.style.cursor = "default")}
          />
        </div>
      </div>
      <div className={styles.progressContainer}>
        <p className={styles.progressMessage}>{message}</p>
      </div>
      <div className={styles.subStepControls}>
        {!(id === "1" && subId === "1") && (
          <Button text="이전으로" onClick={handlePrevStep} color="pink" />
        )}
        <Button text="저장하기" onClick={saveCanvas} color="pink" />
        {!(id === "3" && subId === "12") && (
          <Button text="다음으로" onClick={handleNextStep} color="pink" />
        )}
      </div>
    </div>
  );
};

export default SubStep;