import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from './Button';
import styles from './SubStep.module.css';
import { Icon } from '@iconify/react';
import arrowLeft from '@iconify-icons/mdi/arrow-left';

const SubStep = () => {
  const { id, subId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [userPath, setUserPath] = useState([]);
  const [message, setMessage] = useState("🎨 그림을 그려보세요!");
  const [templateData, setTemplateData] = useState(null);
  const [totalTemplatePixels, setTotalTemplatePixels] = useState(1);

  const getStepImage = () => {
    return `/images/${id}step/${subId}.png`; 
  };

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
        // offscreen canvas를 사용하여 템플릿 이미지를 회색으로 변환
        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext('2d');

        // 원본 이미지를 offscreen canvas에 그림
        offCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // offscreen canvas에서 이미지 데이터를 가져옴
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 검은색(또는 어두운) 픽셀을 회색으로 변환 (예: rgb(150,150,150))
        for (let i = 0; i < data.length; i += 4) {
          // 픽셀이 투명하지 않고, R, G, B 값이 낮으면 (검정 또는 어두운 색) 변환
          if (data[i+3] > 0 && data[i] < 100 && data[i+1] < 100 && data[i+2] < 100) {
            data[i] = 150;     // Red
            data[i+1] = 150;   // Green
            data[i+2] = 150;   // Blue
          }
        }
        // 수정된 데이터를 offscreen canvas에 다시 적용
        offCtx.putImageData(imageData, 0, 0);

        // 변환된 회색 템플릿을 메인 캔버스에 그림
        ctx.drawImage(offCanvas, 0, 0);

        // 진행률 계산을 위해 템플릿 데이터를 저장
        const processedTemplate = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        setTemplateData(processedTemplate);

        // 회색(50~200 범위의 색상) 픽셀 수를 총 템플릿 픽셀 수로 계산
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r >= 50 && r <= 200 && g >= 50 && g <= 200 && b >= 50 && b <= 200) {
            count++;
          }
        }
        setTotalTemplatePixels(count);
      };
    }
  };

  const clearCanvas = () => {
    drawTemplate();
    setUserPath([]);
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
    setUserPath([]);
    setMessage("🖌️ 그리는 중...");
    const ctx = ctxRef.current;
    ctx.lineWidth = 40; 
    ctx.lineCap = "round"; 
    ctx.lineJoin = "round"; 
    ctx.strokeStyle = "#000000"; 

    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const computeMatchPercentage = (path) => {
    if (!templateData || totalTemplatePixels === 0) return 0;

    let matchCount = 0;
    const imgData = templateData.data;
    const width = canvasRef.current.width;
    const tolerance = 30; 

    path.forEach(({ x, y }) => {
      const pixelIndex = (Math.round(y) * width + Math.round(x)) * 4;
      const r = imgData[pixelIndex];
      const g = imgData[pixelIndex + 1];
      const b = imgData[pixelIndex + 2];

      const isGray = r >= 50 && r <= 200 && g >= 50 && g <= 200 && b >= 50 && b <= 200;
      if (isGray) matchCount++;
    });

    return (matchCount / totalTemplatePixels) * 100;
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    const { x, y } = getMousePos(e);
    
    setUserPath((prevPath) => {
      const newPath = [...prevPath, { x, y }];
      const percentage = computeMatchPercentage(newPath);
      setMessage(`✅ ${percentage.toFixed(1)}% 정확도`);
      return newPath;
    });

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();

    setUserPath((prevPath) => {
      const percentage = computeMatchPercentage(prevPath);
      localStorage.setItem(`step-${id}-${subId}`, percentage.toFixed(1));
      
      if (percentage >= 70) {
        setMessage(`🎉 성공적으로 그렸습니다! (${percentage.toFixed(1)}%)`);
      } else {
        setMessage("❌ 다시 시도하세요!");
      }
      return prevPath;
    });
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
      <h2 className={styles.subStepTitle}>Step {id} - {subId}</h2>
      <div id="captureArea" className={styles.canvasWrapper}>
        <button className={styles.backButton} onClick={() => navigate(`/step/${id}`)}>
          <Icon icon={arrowLeft} width="30" height="30" />
        </button>
        <button className={styles.clearButton} onClick={clearCanvas}> 초기화</button>
        <canvas
          ref={canvasRef}
          className={styles.drawingCanvas}
          width={2000}
          height={1600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseEnter={() => canvasRef.current.style.cursor = "url('/images/brush handwriting.cur'), auto"}
          onMouseLeave={() => canvasRef.current.style.cursor = "default"}
        ></canvas>
      </div>
      <div className={styles.progressContainer}>
        <p className={styles.progressMessage}>{message}</p>
      </div>
      <div className={styles.subStepControls}>
        {!(id === "1" && subId === "1") && (
          <Button text="이전으로" onClick={handlePrevStep} color="pink" />
        )}
        <Button text="저장하기" onClick={() => alert('저장 기능 추가 가능')} color="pink" />
        {!(id === "3" && subId === "12") && (
          <Button text="다음으로" onClick={handleNextStep} color="pink" />
        )}
      </div>
    </div>
  );
};

export default SubStep;