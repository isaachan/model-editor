import React from 'react'
import './Toolbar.css'

const Toolbar: React.FC = () => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" title="New">New</button>
        <button className="toolbar-btn" title="Save">Save</button>
        <button className="toolbar-btn" title="Export SVG">Export SVG</button>
        <button className="toolbar-btn" title="Export PNG">Export PNG</button>
      </div>
      <div className="toolbar-group">
        <button className="toolbar-btn" title="Undo">Undo</button>
        <button className="toolbar-btn" title="Redo">Redo</button>
      </div>
      <div className="toolbar-separator"></div>
      <div className="toolbar-group">
        <button className="toolbar-btn" title="Select">Select</button>
        <button className="toolbar-btn" title="Type">Type</button>
        <button className="toolbar-btn" title="Relation">Relation</button>
        <button className="toolbar-btn" title="Generalization">Generalization</button>
        <button className="toolbar-btn" title="Note">Note</button>
      </div>
    </div>
  )
}

export default Toolbar
