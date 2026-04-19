import React from 'react'
import ModelProvider from './store/ModelProvider'
import Canvas from './components/Canvas/Canvas'
import Toolbar from './components/Toolbar/Toolbar'
import './App.css'

function App() {
  return (
    <ModelProvider>
      <div className="app">
        <Toolbar />
        <Canvas />
      </div>
    </ModelProvider>
  )
}

export default App
