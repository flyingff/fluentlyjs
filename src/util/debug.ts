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

export const isDevelopmentMode = (() => {
  try {
    return process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
})();
