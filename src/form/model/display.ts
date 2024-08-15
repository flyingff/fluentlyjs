import { AsyncValue, EventRegistry, ReducedValue, Scope } from 'fluentlyjs';
import { GetterOf } from '@/util/typings';

const getOriginalValueGetter = <T>(
  value: T | GetterOf<T> | AsyncValue<T>,
): GetterOf<T> => {
  if (typeof value === 'function') {
    return value as GetterOf<T>;
  }
  if (typeof value === 'object' && value && 'value' in value) {
    return () => value.value;
  }

  return () => value;
};

export class TransientValue<T> implements AsyncValue<T> {
  private readonly theValue: ReducedValue<T>;

  private readonly originalValueGetter: GetterOf<T>;

  public readonly changeEvent: EventRegistry<T>;

  constructor(
    initialValue: T | GetterOf<T> | AsyncValue<T>,
    scope = Scope.global,
  ) {
    this.changeEvent = new EventRegistry(scope);
    this.originalValueGetter = getOriginalValueGetter(initialValue);
    this.theValue = ReducedValue.lastEventValue(
      this.changeEvent,
      this.originalValueGetter(),
    );
  }

  get value() {
    return this.theValue.value;
  }

  get resolved() {
    return this.theValue.resolved;
  }

  updateValue(value: T) {
    this.changeEvent.emitOnce(value);
  }

  updatePartial(value: Partial<T>) {
    this.changeEvent.emitOnce({
      ...this.value,
      ...value,
    });
  }

  reset() {
    this.changeEvent.emitOnce(this.originalValueGetter());
  }
}
