export const createStackContext = <T>() => {
  const holder: T[] = [];
  const runInContext = <U>(object: T, fn: () => U): U => {
    holder.push(object);
    try {
      return fn();
    } finally {
      holder.pop();
    }
  };
  const getContextValue = () => holder[holder.length - 1];
  return { runInContext, getContextValue };
};
