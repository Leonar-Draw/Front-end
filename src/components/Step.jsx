import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react'; // ✅ 아이콘 추가
import homeIcon from '@iconify-icons/mdi/home'; 
import Button from './Button';
import styles from './Step.module.css';

const Step = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleNextStep = () => {
    const nextStep = parseInt(id) + 1;
    if (nextStep <= 3) { 
      navigate(`/step/${nextStep}`);
    }
  };

  const handlePrevStep = () => {
    const prevStep = parseInt(id) - 1;
    if (prevStep >= 1) { 
      navigate(`/step/${prevStep}`);
    }
  };

  const navigateToSubStep = (subId) => {
    navigate(`/step/${id}/${subId}`);
  };

  return (
    <div className={styles.stepContainer}>
      

      <h2 className={styles.stepTitle}>Step {id}</h2>

      <div className={styles.stepButtons}>
        {Array.from({ length: 12 }, (_, i) => {
          const subId = i + 1;
          const progress = localStorage.getItem(`step-${id}-${subId}`) || 0;

          return (
            <div key={i} className={styles.stepButtonContainer}>
              <button className={styles.stepButton} onClick={() => navigateToSubStep(subId)}>
                {id}-{subId}
              </button>
              <div className={styles.progressText}>{progress}%</div> {/* 🔥 버튼 아래 퍼센트 표시 */}
            </div>
          );
        })}
      </div>

      <div className={styles.stepControls}>
        <Button text="이전 단계" onClick={handlePrevStep} color="pink" />

        {/* ✅ 홈 버튼을 추가 (저장하기 버튼 자리에) */}
        <button className={styles.homeButton} onClick={() => navigate('/')}>
          <Icon icon={homeIcon} width="30" height="30" />
        </button>
        
        <Button text="다음 단계" onClick={handleNextStep} color="pink" />
      </div>
    </div>
  );
};

export default Step;
