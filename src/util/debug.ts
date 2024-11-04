export const getCurrentDeclarePosition = () => {
  const error = new Error();
  if (error.stack) {
    const { stack } = error;
    const stackLines = stack.split('\n');
    if (stackLines.length > 2) {
      const declarePosition = stackLines[2];
      return declarePosition.replace(/^\s+at\s+/, '');
    }
  }
  return '(unknown)';
};
