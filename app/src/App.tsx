import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './dashboard/home.tsx'
import Login from './auth/login.tsx'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
    </Routes>
  )
}

export default App
