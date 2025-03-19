// src/components/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

const Home = () => {
  const navigate = useNavigate();

  const handlePlay = () => {
    navigate('/step/1');
  };

  return (
    <div className={styles.container}>
      {/* 시작하기 버튼 (아래 중앙 정렬) */}
      <button className={styles.startButton} onClick={handlePlay}>
        시작하기
      </button>
      {/* 오른쪽 아래 웹캠 화면 추가 */}
      <div className={styles.webcamContainer}>
        <img src="http://localhost:8000/video" className={styles.webcamFeed} />
      </div>
    </div>
  );
};

export default Home;