export type GetterOf<T> = () => T;
export type MapperOf<InputType extends any[], OUTPUT> = (
  ...input: InputType
) => OUTPUT;
