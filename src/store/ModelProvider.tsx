import React, { useReducer, useCallback, useEffect } from 'react'
import { DiagramModel, ModelElement, Tool } from '../types'
import { ModelContext, initialState, initialModel } from './ModelContext'

type Action =
  | { type: 'ADD_ELEMENT'; payload: ModelElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<ModelElement> } }
  | { type: 'DELETE_ELEMENTS'; payload: string[] }
  | { type: 'SELECT_ELEMENTS'; payload: string[] }
  | { type: 'SET_CURRENT_TOOL'; payload: Tool }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN_OFFSET'; payload: { x: number; y: number } }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_MODEL'; payload: DiagramModel }
  | { type: 'PUSH_UNDO' };

const cloneModel = (model: DiagramModel): DiagramModel => ({
  ...model,
  elements: model.elements.map(e => JSON.parse(JSON.stringify(e))),
});

const modelReducer = (state: typeof initialState, action: Action): typeof initialState => {
  switch (action.type) {
    case 'PUSH_UNDO': {
      return {
        ...state,
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    }
    case 'ADD_ELEMENT': {
      const newModel = cloneModel(state.model);
      newModel.elements.push(action.payload);
      return {
        ...state,
        model: newModel,
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    }
    case 'UPDATE_ELEMENT': {
      const newModel = cloneModel(state.model);
      const index = newModel.elements.findIndex(e => e.id === action.payload.id);
      if (index >= 0) {
        newModel.elements[index] = {
          ...newModel.elements[index],
          ...action.payload.updates,
        } as ModelElement;
      }
      return {
        ...state,
        model: newModel,
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    }
    case 'DELETE_ELEMENTS': {
      const newModel = cloneModel(state.model);
      const idsToDelete = new Set(action.payload);
      // 删除元素本身
      newModel.elements = newModel.elements.filter(e => !idsToDelete.has(e.id));
      // 删除指向这些元素的关系和泛化
      newModel.elements = newModel.elements.filter(e => {
        if (e.type === 'relation') {
          return !idsToDelete.has(e.source.typeId) && !idsToDelete.has(e.target.typeId);
        }
        if (e.type === 'generalization') {
          if (idsToDelete.has(e.parentTypeId)) return false;
          e.childTypeIds = e.childTypeIds.filter(id => !idsToDelete.has(id));
          return e.childTypeIds.length > 0;
        }
        if (e.type === 'note' && e.attachedTo && idsToDelete.has(e.attachedTo)) {
          return false;
        }
        return true;
      });
      return {
        ...state,
        model: newModel,
        selectedElements: [],
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    }
    case 'SELECT_ELEMENTS':
      return {
        ...state,
        selectedElements: action.payload,
      };
    case 'SET_CURRENT_TOOL':
      return {
        ...state,
        currentTool: action.payload,
      };
    case 'SET_ZOOM':
      return {
        ...state,
        zoom: action.payload,
      };
    case 'SET_PAN_OFFSET':
      return {
        ...state,
        panOffset: action.payload,
      };
    case 'CLEAR_CANVAS':
      return {
        ...state,
        model: { ...initialModel },
        selectedElements: [],
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prevModel = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      return {
        ...state,
        model: prevModel,
        undoStack: newUndoStack,
        redoStack: [cloneModel(state.model), ...state.redoStack],
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const nextModel = state.redoStack[0];
      const newRedoStack = state.redoStack.slice(1);
      return {
        ...state,
        model: nextModel,
        redoStack: newRedoStack,
        undoStack: [...state.undoStack, cloneModel(state.model)],
      };
    }
    case 'LOAD_MODEL':
      return {
        ...state,
        model: cloneModel(action.payload),
        undoStack: [...state.undoStack, cloneModel(state.model)],
        redoStack: [],
      };
    default:
      return state;
  }
};

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(modelReducer, initialState);

  const addElement = useCallback((element: ModelElement) => {
    dispatch({ type: 'ADD_ELEMENT', payload: element });
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<ModelElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  }, []);

  const deleteElements = useCallback((ids: string[]) => {
    dispatch({ type: 'DELETE_ELEMENTS', payload: ids });
  }, []);

  const selectElements = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_ELEMENTS', payload: ids });
  }, []);

  const setCurrentTool = useCallback((tool: Tool) => {
    dispatch({ type: 'SET_CURRENT_TOOL', payload: tool });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setPanOffset = useCallback((offset: { x: number; y: number }) => {
    dispatch({ type: 'SET_PAN_OFFSET', payload: offset });
  }, []);

  const clearCanvas = useCallback(() => {
    dispatch({ type: 'CLEAR_CANVAS' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const loadModel = useCallback((model: DiagramModel) => {
    dispatch({ type: 'LOAD_MODEL', payload: model });
  }, []);

  // 自动保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('model-editor-current', JSON.stringify(state.model));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [state.model]);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const saved = localStorage.getItem('model-editor-current');
      if (saved) {
        const parsed = JSON.parse(saved) as DiagramModel;
        dispatch({ type: 'LOAD_MODEL', payload: parsed });
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }, []);

  const value = {
    ...state,
    addElement,
    updateElement,
    deleteElements,
    selectElements,
    setCurrentTool,
    setZoom,
    setPanOffset,
    clearCanvas,
    undo,
    redo,
    loadModel,
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

export default ModelProvider;
