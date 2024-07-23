import { AsyncValue, EventRegistry } from '@/declarative';
import { TodoCreateItem, TodoItem, TodoItemFilter } from './typings';
import { Scope } from '@/context';
import { ReducedValue } from '@/declarative/reducer';
import { AsyncMap } from '@/declarative/asyncMap';
import {
  createTodoList,
  deleteTodoList,
  getTodoList,
  updateTodoList,
} from '../service';
import { Action } from '@/declarative/action';

class TodoManagerEvents {
  readonly addTodoEvent: EventRegistry<TodoCreateItem>;
  readonly deleteTodoEvent: EventRegistry<string>;
  readonly toggleTodoEvent: EventRegistry<[id: string, complete: boolean]>;
  readonly refreshTodoListEvent: EventRegistry<void>;
  readonly updateFilterEvent: EventRegistry<Partial<TodoItemFilter>>;

  constructor(scope: Scope) {
    this.addTodoEvent = new EventRegistry(scope);
    this.deleteTodoEvent = new EventRegistry(scope);
    this.toggleTodoEvent = new EventRegistry(scope);
    this.refreshTodoListEvent = new EventRegistry(scope);
    this.updateFilterEvent = new EventRegistry(scope);
  }
}

export const DEFAULT_TODO_LIST_FILTER: TodoItemFilter = {
  queryAt: Date.now(),
};

export class TodoManagerModel {
  readonly scope: Scope = new Scope();

  readonly events: TodoManagerEvents;

  // 当前展示的待办事项列表
  readonly displayTodoList: AsyncMap<TodoItemFilter, TodoItem[]>;

  // 当前生效的待办事项列表的过滤条件
  readonly appliedTodoListFilter: ReducedValue<TodoItemFilter>;

  readonly deleteTodoItemAction: Action<string>;

  readonly addTodoItemAction: Action<TodoCreateItem, string>;

  readonly toggleTodoItemAction: Action<[id: string, complete: boolean]>;

  constructor() {
    this.events = new TodoManagerEvents(this.scope);
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
