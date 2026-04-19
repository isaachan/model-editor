let counter = 0;

export const generateId = (prefix: string): string => {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
};
