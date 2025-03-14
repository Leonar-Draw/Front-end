// src/components/Step.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from './Button';
import styles from './Step.module.css';

const Step = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleNextStep = () => {
    const nextStep = parseInt(id) + 1;
    navigate(`/step/${nextStep}`);
  };

  const navigateToSubStep = (subId) => {
    navigate(`/step/${id}/${subId}`);
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Step {id}</h2>
      <div className={styles.stepButtons}>
        {Array.from({ length: 12 }, (_, i) => (
          <button key={i} className={styles.stepButton} onClick={() => navigateToSubStep(i + 1)}>
            {id}-{i + 1}
          </button>
        ))}
      </div>
      <div className={styles.stepControls}>
        <Button text="이전단계" onClick={() => navigate(-1)} color="pink" />
        <Button text="저장하기" onClick={() => alert('저장하기 clicked!')} color="pink" />
        <Button text="다음단계" onClick={handleNextStep} color="pink" />
      </div>
    </div>
  );
};

export default Step;