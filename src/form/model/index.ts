import {
  Action,
  AsyncMap,
  EventRegistry,
  ReducedValue,
  Scope,
} from 'fluentlyjs';
import { TodoCreateItem, TodoItem, TodoItemFilter } from './typings';

import {
  createTodoList,
  deleteTodoList,
  getTodoList,
  updateTodoList,
} from '../service';

class TodoManagerEvents {
  readonly addTodoEvent: EventRegistry<TodoCreateItem>;
  readonly deleteTodoEvent: EventRegistry<string>;
  readonly toggleTodoEvent: EventRegistry<[id: string, complete: boolean]>;
  readonly refreshTodoListEvent: EventRegistry<void>;
  readonly updateFilterEvent: EventRegistry<Partial<TodoItemFilter>>;

  constructor() {
    this.addTodoEvent = new EventRegistry();
    this.deleteTodoEvent = new EventRegistry();
    this.toggleTodoEvent = new EventRegistry();
    this.refreshTodoListEvent = new EventRegistry();
    this.updateFilterEvent = new EventRegistry();
  }
}

export const DEFAULT_TODO_LIST_FILTER: TodoItemFilter = {
  queryAt: Date.now(),
};

export class TodoManagerModel {
  public static create(parentScope: Scope = Scope.global) {
    const scope = new Scope(parentScope);
    return scope.declareInside(() => new TodoManagerModel(scope));
  }

  readonly scope: Scope;

  readonly events: TodoManagerEvents;

  // 当前展示的待办事项列表
  readonly displayTodoList: AsyncMap<TodoItemFilter, TodoItem[]>;

  // 当前生效的待办事项列表的过滤条件
  readonly appliedTodoListFilter: ReducedValue<TodoItemFilter>;

  readonly deleteTodoItemAction: Action<string>;

  readonly addTodoItemAction: Action<TodoCreateItem, string>;

  readonly toggleTodoItemAction: Action<[id: string, complete: boolean]>;

  protected constructor(scope: Scope) {
    this.scope = scope;
    this.events = new TodoManagerEvents();
    this.displayTodoList = new AsyncMap(
      () => this.appliedTodoListFilter,
      (filter) => {
        return getTodoList(filter);
      },
      [],
    );

    this.appliedTodoListFilter = ReducedValue.builder<TodoItemFilter>()
      .addReducer(this.events.updateFilterEvent, (state, filter) => {
        return {
          ...state,
          ...filter,
          queryAt: Date.now(),
        };
      })
      .addReducer(this.events.refreshTodoListEvent, (state) => {
        return {
          ...state,
          queryAt: Date.now(),
        };
      })
      .build(DEFAULT_TODO_LIST_FILTER);

    this.deleteTodoItemAction = new Action((id) => deleteTodoList(id));
    this.deleteTodoItemAction.triggersDoneEvent(
      this.events.refreshTodoListEvent,
    );
    this.deleteTodoItemAction.runOn(this.events.deleteTodoEvent, (it) => it);

    this.addTodoItemAction = new Action(async (item) => {
      const itemId = await createTodoList(item);
      return { data: '', result: !!itemId };
    });
    this.addTodoItemAction.triggersDoneEventWithMapper(
      this.events.refreshTodoListEvent,
      () => undefined,
    );
    this.addTodoItemAction.runOn(this.events.addTodoEvent, (it) => it);

    this.toggleTodoItemAction = new Action(([id, completed]) => {
      return updateTodoList(id, { completed });
    });
    this.toggleTodoItemAction.triggersDoneEvent(
      this.events.refreshTodoListEvent,
    );
    this.toggleTodoItemAction.runOn(this.events.toggleTodoEvent, (it) => it);
  }
}
