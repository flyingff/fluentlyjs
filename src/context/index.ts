// context用于承载两类物体：生命周期和对象命名空间
// context可以嵌套，表示子context继承父context的生命周期和对象命名空间
// 一般认为context是一个树形结构，根节点是全局context，子节点是局部context
// context的生命周期是树形结构的，子context的生命周期不能超过父context的生命周期
// context的对象命名空间是树形结构的，子context的对象命名空间不能覆盖父context的对象命名空间
// 生命周期的用途：用于管理对象的生命周期，当context销毁时，会自动销毁context中的所有对象
// 对象命名空间的用途：用于按名称或类型查找对象，context可以通过名称或类型查找到子context中的对象，就像spring的bean一样
// context的生命周期和对象命名空间是分开的，可以只使用其中一个，也可以同时使用两个

import { Lifecycle } from './lifecycle';
import { Namespace } from './namespace';
import { ScopeDisposable, scopeDisposeSymbol, Scoped } from './typings';
import { createStackContext } from '@/util/stack';

const { runInContext, getContextValue } = createStackContext<Scope>();

// 给这个类取个什么名字呢？
// 不要叫Context，因为这个名字太常见了，容易和其他库冲突
// 可以叫做Scope，因为这个类的作用就是创建一个作用域，这个作用域可以包含对象，也可以包含子作用域
class Scope implements ScopeDisposable {
  public static readonly global: Scope = new Scope(null);

  public static get current(): Scope {
    return getContextValue() || Scope.global;
  }

  public static get requiredCurrent(): Scope {
    const v = getContextValue();
    if (v === null) {
      throw new Error('This operation requires a `Scope` to be present.');
    }
    return v;
  }

  // 父作用域
  private readonly _parent: Scope | null;

  // 生命周期
  private readonly _lifecycle: Lifecycle;

  // 对象命名空间
  private readonly _namespace: Namespace;

  public constructor(parent: Scope | null = Scope.current) {
    this._parent = parent;
    this._lifecycle = new Lifecycle();
    this._namespace = new Namespace(parent?.namespace || null, this._lifecycle);
  }

  // 获取父作用域
  get parent(): Scope | null {
    return this._parent;
  }

  // 获取生命周期
  get lifecycle(): Lifecycle {
    return this._lifecycle;
  }

  // 获取对象命名空间
  get namespace(): Namespace {
    return this._namespace;
  }

  get disposed(): boolean {
    return this._lifecycle.disposed;
  }

  // 销毁作用域
  [scopeDisposeSymbol](): void {
    this._lifecycle.dispose();
  }

  public declareInside<T>(fn: () => T): T {
    return runInContext(this, fn);
  }
}

export {
  Scope,
  scopeDisposeSymbol,
  type ScopeDisposable,
  type Scoped,
  Lifecycle,
  Namespace,
};
