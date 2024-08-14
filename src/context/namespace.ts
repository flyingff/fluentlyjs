// 这个类的设计参考了spring的bean的设计，spring的bean也是有生命周期和对象命名空间的

import { ScopeDisposable, scopeDisposeSymbol } from './typings';
import { Lifecycle } from './lifecycle';

type Constructor<T> = abstract new (...args: any) => T;

class Namespace implements ScopeDisposable {
  private readonly _parent: Namespace | null;

  private readonly _lifeCycle: Lifecycle;

  private readonly _objects: Map<string, any>;

  private readonly _objectsByType: Map<any, any>;

  public constructor(parent: Namespace | null, lifecycle: Lifecycle) {
    this._parent = parent;
    this._lifeCycle = lifecycle;
    this._objects = new Map();
    this._objectsByType = new Map();

    this._lifeCycle.addDisposeListener(() => {
      this[scopeDisposeSymbol]();
    });
  }

  public get parent(): Namespace | null {
    return this._parent;
  }

  public get isRoot(): boolean {
    return this._parent === null;
  }

  // does NOT provide way to list children, because it may introduce reference issues

  // does NOT provide way to list objects, because it will break encapsulation

  addObject(name: string, object: any): void {
    this._objects.set(name, object);
  }

  addObjectByType<T extends Constructor<any>>(
    type: T,
    object: InstanceType<T>,
  ): void {
    this._objectsByType.set(type, object);
  }

  removeObject(name: string): void {
    this._objects.delete(name);
  }

  removeObjectByType<T extends Constructor<any>>(type: T): void {
    this._objectsByType.delete(type);
  }

  findObject<T>(name: string): T | null {
    return (
      this._objects.get(name) ||
      (this._parent ? this._parent.findObject(name) : null)
    );
  }

  findObjectByType<T>(type: Constructor<T>): T | null {
    return (
      this._objectsByType.get(type) ||
      (this._parent ? this._parent.findObjectByType(type) : null)
    );
  }

  [scopeDisposeSymbol](): void {
    this._objects.clear();
    this._objectsByType.clear();
  }
}

export { Namespace };
