import { useContext } from 'react';
import { C } from '../app/context';

export const useApp = () => useContext(C);
