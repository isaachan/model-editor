import { useContext } from 'react';
import { ModelContext } from '../store/ModelContext';

export const useModel = () => {
  return useContext(ModelContext);
};
