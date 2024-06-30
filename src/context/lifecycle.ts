import EventEmitter from 'events';

class Lifecycle {
  private readonly _parent: Lifecycle | null;

  private _disposed = false;
  private readonly disposePromise: Promise<void>;

  private eventEmitter: EventEmitter;

  public constructor(parent: Lifecycle | null = null) {
    this._parent = parent;
    this.eventEmitter = new EventEmitter();
    this.disposePromise = new Promise((resolve) => {
      this.eventEmitter.on('dispose', resolve);
    });
    if (parent) {
      parent.addDisposeListener(this.dispose);
    }
  }

  public get disposed(): boolean {
    return this._disposed;
  }

  public get asPromise(): Promise<void> {
    return this.disposePromise;
  }

  public addDisposeListener(listener: () => void): void {
    // 如果已经销毁了，没有必要再添加监听器
    if (this._disposed) {
      return;
    }

    // 添加销毁监听器
    this.eventEmitter.on('dispose', listener);
  }

  public removeDisposeListener(listener: () => void): void {
    // 移除销毁监听器
    this.eventEmitter.off('dispose', listener);
  }

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
