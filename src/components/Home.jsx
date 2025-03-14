// src/components/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

// 이미지 경로 (src/components → ../../images/logo.png)
// import logo from '../images/logo.png';

const Home = () => {
  const navigate = useNavigate();

  const handlePlay = () => {
    navigate('/step/1');
  };

  return (
    <div className={styles.container}>
      {/* 오른쪽 상단 로고 */}
      {/* <img src={logo} alt="Logo" className={styles.logo} /> */}

      {/* 왼쪽 텍스트와 버튼 영역 */}
      <div className={styles.content}>
        <h1 className={styles.title}>LeonarDraw</h1>
        <p className={styles.subtitle}>
          당신의 시선이 붓이 됩니다.<br />
          동공으로 그림을 완성해보세요!
        </p>
        <button className={styles.startButton} onClick={handlePlay}>
          시작하기
        </button>
      </div>
    </div>
  );
};

export default Home;