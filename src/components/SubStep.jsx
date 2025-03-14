import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from './Button';
import styles from './SubStep.module.css';
import html2canvas from "html2canvas";
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
  const [lineWidth, setLineWidth] = useState(5); // 기본 선 굵기 설정

  const getStepImage = () => {
    const stepImages = {
      "1-1": "/images/line.png",
      "1-2": "/images/monariza.png",
      "1-3": "/images/cross.png",
      "1-4": "/images/semi-circle.png",
      "1-5": "/images/circle.png",
      "2-1": "/images/fish.png",
      "2-2": "/images/clover.png",
      "2-3": "/images/dog.png",
      "2-4": "/images/car.png",
      "3-1": "/images/starry-night.png",
      "3-2": "/images/mona-lisa.png"
    };
    return stepImages[`${id}-${subId}`] || null;
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
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
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
    ctx.lineWidth = 10; 
    ctx.lineCap = "round"; 
    ctx.lineJoin = "round"; 

    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const computeMatchPercentage = (path) => {
    let matchCount = 0;
    const tolerance = 20; // ✅ 거리 오차 범위 조금 넓힘
    const templatePath = generateTemplatePath();
  
    path.forEach(({ x: ux, y: uy }) => {
      const isMatched = templatePath.some(({ x: tx, y: ty }) => 
        Math.abs(ux - tx) <= tolerance && Math.abs(uy - ty) <= tolerance
      );
      if (isMatched) matchCount++;
    });
  
    // ✅ 전체 그린 부분 중 매칭된 비율 반환
    return matchCount > 0 ? (matchCount / templatePath.length) * 100 : 0;
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    const { x, y } = getMousePos(e);
    
    setUserPath((prevPath) => {
      const newPath = [...prevPath, { x, y }];
      const percentage = computeMatchPercentage(newPath); // ✅ newPath 사용
  
      // ✅ 실시간 퍼센트 업데이트
      setMessage(`✅ ${percentage.toFixed(1)}% 그렸습니다!`);
  
      return newPath;
    });
  
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();
  
    // ✅ userPath가 아니라 최신 newPath로 퍼센트 계산
    setUserPath((prevPath) => {
      const percentage = computeMatchPercentage(prevPath);
  
      if (percentage >= 70) {
        setMessage(`🎉 성공적으로 그렸습니다! (${percentage.toFixed(1)}%)`);
      } else {
        setMessage("❌ 다시 시도하세요!");
      }
  
      return prevPath;
    });
  };

  const generateTemplatePath = () => {
    let path = [];
    
    // Step 별로 템플릿 경로 다르게 설정
    if (id === "1" && subId === "1") {  
      // 1-1 단계는 직선
      for (let x = 500; x <= 1500; x += 10) {
        path.push({ x, y: 800 }); // 직선이므로 y값은 고정
      }
    } else if (id === "1" && subId === "2") {
      // 1-2 단계는 모나리자 (그림이므로 패턴이 필요)
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
        let x = 1000 + 150 * Math.cos(angle);
        let y = 800 + 150 * Math.sin(angle);
        path.push({ x, y });
      }
    } else {
      // 기본 원형 패턴 (기존 코드)
      for (let angle = Math.PI; angle <= 2 * Math.PI; angle += 0.05) {
        let x = 1000 + 150 * Math.cos(angle);
        let y = 800 + 150 * Math.sin(angle);
        path.push({ x, y });
      }
    }
    
    return path;
  };

  // ✅ 이전 단계 이동 (1-1 이하로 내려가지 않도록 제한)
  const handlePrevStep = () => {
    // 현재 subId가 1이면 이전 Step으로 이동
    if (parseInt(subId) === 1) {
      const prevStep = Math.max(1, parseInt(id) - 1); // 최소 Step 1까지 유지
      navigate(`/step/${prevStep}/12`); // 이전 Step의 마지막 단계(12)로 이동
    } else {
      navigate(`/step/${id}/${parseInt(subId) - 1}`);
    }
  };

  // ✅ 다음 단계 이동 (1-12 이상으로 넘어가지 않도록 제한)
  const handleNextStep = () => {
    // 현재 subId가 12이면 다음 Step으로 이동
    if (parseInt(subId) === 12) {
      const nextStep = Math.min(3, parseInt(id) + 1); // 최대 Step 3까지 이동 가능
      navigate(`/step/${nextStep}/1`); // 다음 Step의 첫 번째 단계(1)로 이동
    } else {
      navigate(`/step/${id}/${parseInt(subId) + 1}`);
    }
  };

  // ✅ 'captureArea' 영역을 캡처하여 PNG로 저장하는 함수
  const saveCaptureAreaAsImage = () => {
    const captureElement = document.getElementById("captureArea");  // ✅ 캡처할 영역 설정

    html2canvas(captureElement, { backgroundColor: null }).then((canvas) => {
      const image = canvas.toDataURL("image/png");  // ✅ PNG 변환
      const link = document.createElement("a");
      link.href = image;
      link.download = `capture_${id}_${subId}.png`;  // ✅ 파일명 설정
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
  <div className={styles.subStepContainer}>
    

    <h2 className={styles.subStepTitle}>Step {id} - {subId}</h2>

    <div id="captureArea" className={styles.canvasWrapper}>
      {/* ✅ 화살표 아이콘 (왼쪽 위) */}
      <button className={styles.backButton} onClick={() => navigate(`/step/${id}`)}>
        <Icon icon={arrowLeft} width="30" height="30" />
      </button>
      {/* ✅ 초기화 버튼 */}
      <button className={styles.clearButton} onClick={clearCanvas}>🗑 초기화</button>
      
      {/* ✅ 캔버스 */}
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

    {/* ✅ 실시간 퍼센트 및 성공 여부 메시지 표시 */}
    <div className={styles.progressContainer}>
      <p className={styles.progressMessage}>{message}</p>
    </div>

    {/* ✅ 버튼 컨트롤 영역 */}
    <div className={styles.subStepControls}>
      <Button 
        text="이전으로" 
        onClick={handlePrevStep} 
        color="pink" 
      />
      <Button 
        text="저장하기" 
        onClick={saveCaptureAreaAsImage} 
        color="pink" 
      />
      <Button 
        text="다음으로" 
        onClick={handleNextStep} 
        color="pink" 
      />
    </div>
  </div>
);
};

export default SubStep;