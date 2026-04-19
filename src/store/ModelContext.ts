import { createContext } from 'react'
import { DiagramModel, ModelElement, Tool } from '../types'

export interface ModelContextState {
  model: DiagramModel;
  selectedElements: string[];
  currentTool: Tool;
  zoom: number;
  panOffset: { x: number; y: number };
  undoStack: DiagramModel[];
  redoStack: DiagramModel[];
}

export interface ModelContextActions {
  addElement: (element: ModelElement) => void;
  updateElement: (id: string, updates: Partial<ModelElement>) => void;
  deleteElements: (ids: string[]) => void;
  selectElements: (ids: string[]) => void;
  setCurrentTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  loadModel: (model: DiagramModel) => void;
}

export const initialModel: DiagramModel = {
  version: '1.0',
  elements: [],
};

export const initialState: ModelContextState = {
  model: initialModel,
  selectedElements: [],
  currentTool: 'select',
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
};

export const ModelContext = createContext<ModelContextState & ModelContextActions>({
  ...initialState,
  addElement: () => {},
  updateElement: () => {},
  deleteElements: () => {},
  selectElements: () => {},
  setCurrentTool: () => {},
  setZoom: () => {},
  setPanOffset: () => {},
  clearCanvas: () => {},
  undo: () => {},
  redo: () => {},
  loadModel: () => {},
});
