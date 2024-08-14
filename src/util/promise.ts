export const createPromiseResolver = <T>() => {
  let resolve: (value: T) => void;
  let reject: (reason: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { resolve: resolve!, reject: reject!, promise };
};

export const delay = (ms: number) =>
  new Promise(resolve => window.setTimeout(resolve, ms));
