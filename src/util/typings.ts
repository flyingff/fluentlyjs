export type GetterOf<T> = () => T;
export type MapperOf<INPUT extends any[], OUTPUT> = (...input: INPUT) => OUTPUT;
