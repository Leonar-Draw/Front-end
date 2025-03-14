// src/components/Button.jsx
import React from 'react';
import styles from './Button.module.css';

const Button = ({ text, onClick, color }) => {
  return (
    <button
      className={`${styles.customButton} ${styles[color]}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default Button;