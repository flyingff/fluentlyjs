import type { Scope } from '.';

export const scopeDisposeSymbol = Symbol.for('scope-dispose');
export interface ScopeDisposable {
  [scopeDisposeSymbol](): void;
}

export interface Scoped extends ScopeDisposable {
  readonly scope: Scope;
}
