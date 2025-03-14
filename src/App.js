// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Step from './components/Step';
import styles from './App.module.css';
import SubStep from './components/SubStep';

function App() {
  return (
    <Router>
      <div className={styles.App}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/step/:id" element={<Step />} />
          <Route path="/step/:id/:subId" element={<SubStep />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;