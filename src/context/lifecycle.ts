import EventEmitter from 'events';

/**
 * 生命周期管理器
 */
class Lifecycle {
  private readonly _parent: Lifecycle | null;

  private _disposed: boolean = false;

  private readonly disposePromise: Promise<void>;

  private eventEmitter: EventEmitter;

  /**
   * 创建一个生命周期管理器
   * @param parent 父级生命周期管理器
   */
  public constructor(parent: Lifecycle | null = null) {
    this._parent = parent;
    this.eventEmitter = new EventEmitter();
    this.disposePromise = new Promise(resolve => {
      this.eventEmitter.on('dispose', resolve);
    });
    if (parent) {
      parent.addDisposeListener(this.dispose);
    }
  }

  /**
   * 是否已经销毁
   */
  public get disposed(): boolean {
    return this._disposed;
  }

  /**
   * 获取销毁时机的 Promise
   */
  public get asPromise(): Promise<void> {
    return this.disposePromise;
  }

  /**
   * 添加销毁监听器
   * @param listener 监听器
   */
  public addDisposeListener(listener: () => void): void {
    // 如果已经销毁了，没有必要再添加监听器
    if (this._disposed) {
      return;
    }

    // 添加销毁监听器
    this.eventEmitter.on('dispose', listener);
  }

  /**
   * 移除销毁监听器
   * @param listener 监听器
   */
  public removeDisposeListener(listener: () => void): void {
    // 移除销毁监听器
    this.eventEmitter.off('dispose', listener);
  }

  /**
   * 销毁该实例，触发所有销毁监听器
   */
  public dispose = () => {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.eventEmitter.emit('dispose');
    this.eventEmitter.removeAllListeners();
    if (this._parent) {
      this._parent.removeDisposeListener(this.dispose);
    }
  };
}

export { Lifecycle };
