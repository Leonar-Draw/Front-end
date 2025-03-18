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
  const isStep1 = parseInt(id) === 1;
  const lineThickness = isStep1 ? 40 : 5;
  const matchThickness = isStep1 ? lineThickness / 2 : lineThickness;

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false); // 그리기 모드 여부
  const [userPath, setUserPath] = useState([]); // 그린 점들을 누적
  const [message, setMessage] = useState("🎨 그림을 그려보세요!");
  const [progress, setProgress] = useState(0); // 진행률 (%)
  const [templateData, setTemplateData] = useState(null);
  const [totalTemplatePixels, setTotalTemplatePixels] = useState(1); // 템플릿의 회색 픽셀 수

  const getStepImage = () => `/images/${id}step/${subId}.png`;

  // id 또는 subId가 변경될 때 템플릿 다시 그리기
  useEffect(() => {
    drawTemplate();
  }, [id, subId]);

  // drawing 상태에 따라 커서 스타일 업데이트 (그리기 모드일 때는 붓 아이콘)
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = drawing
        ? "url('/images/brush handwriting.cur'), auto"
        : "default";
    }
  }, [drawing]);

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
        const processedTemplate = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        setTemplateData(processedTemplate);
        // 회색 픽셀 수 계산 (조건: r, g, b가 50~200)
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          if (r >= 50 && r <= 200 && g >= 50 && g <= 200 && b >= 50 && b <= 200) {
            count++;
          }
        }
        console.log("총 회색 픽셀 수:", count);
        setTotalTemplatePixels(count);

        // 저장된 그리기 데이터 불러오기
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
          setProgress(0);
        }
      };
    }
  };

  // Clear 버튼: 초기화 및 저장된 데이터 삭제
  const clearCanvas = () => {
    drawTemplate();
    setUserPath([]);
    localStorage.removeItem(`drawing-step-${id}-${subId}`);
    localStorage.setItem(`step-${id}-${subId}`, "0");
    setProgress(0);
    setMessage("🎨 그림을 그려보세요!");
  };

  // 캔버스 내 정확한 마우스 좌표 계산 (스케일 고려)
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  // 클릭 시 그리기 모드를 토글하는 함수
  const handleCanvasClick = (e) => {
    const ctx = ctxRef.current;
    const { x, y } = getMousePos(e);
    if (!drawing) {
      // 첫 번째 클릭: 그리기 시작
      setDrawing(true);
      ctx.lineWidth = lineThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(x, y);
      setUserPath([{ x, y }]);
      setMessage("🖌️ 그리는 중...");
    } else {
      // 두 번째 클릭: 그리기 종료
      setDrawing(false);
      ctx.closePath();
      const perc = computeMatchPercentage(userPath);
      localStorage.setItem(`drawing-step-${id}-${subId}`, JSON.stringify(userPath));
      localStorage.setItem(`step-${id}-${subId}`, perc.toFixed(1));
      setProgress(perc);
      if (perc >= 70) {
        setMessage(`🎉 성공적으로 그렸습니다! (${perc.toFixed(1)}%)`);
      } else {
        setMessage(`❌ 다시 시도하세요! / 진행률: ${perc.toFixed(1)}%`);
      }
    }
  };

  // 마우스 이동 시, 그리기 모드가 활성화되어 있으면 선 그리기
  const handleMouseMove = (e) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    const { x, y } = getMousePos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setUserPath((prevPath) => {
      const newPath = [...prevPath, { x, y }];
      const perc = computeMatchPercentage(newPath);
      setProgress(perc);
      setMessage(`✅ 진행률: ${perc.toFixed(1)}%`);
      return newPath;
    });
  };

  // 캔버스 영역을 벗어났을 때 그리기 모드 취소 및 저장 처리
  const handleCanvasMouseLeave = () => {
    if (drawing) {
      setDrawing(false);
      ctxRef.current.closePath();
      const perc = computeMatchPercentage(userPath);
      localStorage.setItem(`drawing-step-${id}-${subId}`, JSON.stringify(userPath));
      localStorage.setItem(`step-${id}-${subId}`, perc.toFixed(1));
      setProgress(perc);
      if (perc >= 70) {
        setMessage(`🎉 성공적으로 그렸습니다! (${perc.toFixed(1)}%)`);
      } else {
        setMessage(`❌ 다시 시도하세요! / 진행률: ${perc.toFixed(1)}%`);
      }
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  };

  // 진행률 계산: 매칭 영역 두께를 반영
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
      {/* 캔버스 클릭시 붓 모드로 전환되는 안내 문구 */}
      <div className={styles.instruction}>
        캔버스를 응시하면 붓 모드로 전환됩니다. 한 번 응시하여 그리기를 시작하고, 다시 응시하면 종료됩니다.
      </div>
      <div className={styles.mainArea}>
        <div className={styles.canvasWrapper}>
          <button className={styles.backButton} onClick={() => navigate(`/step/${id}`)}>
            <Icon icon={arrowLeft} width="30" height="30" />
          </button>
          <button className={styles.clearButton} onClick={clearCanvas}>
            초기화
          </button>
          {/* 모드 표시: 캔버스 내부 우측 상단 등 원하는 위치에 표시 가능 */}
          <div className={styles.modeIndicator}>
            {drawing ? "그리기 모드" : "일반 모드"}
          </div>
          <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            width={1000}
            height={600}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
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