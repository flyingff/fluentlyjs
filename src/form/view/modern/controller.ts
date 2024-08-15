import { makeAutoObservable } from 'mobx';
import { TodoManagerModel } from '../../model';
import { TodoCreateItem, TodoItemFilter } from '../../model/typings';
import { PopupFormModal } from '../../model/form';
import { TransientValue } from '../../model/display';
import React from 'react';

export class ModernTodoListFormController {
  readonly model: TodoManagerModel;

  readonly creatingForm: PopupFormModal<TodoCreateItem>;

  constructor() {
    this.model = TodoManagerModel.create();
    this.creatingForm = new PopupFormModal<TodoCreateItem>(
      this.model.addTodoItemAction,
    );

    makeAutoObservable(this, {}, { autoBind: true, deep: false });
  }

  get listLoading() {
    return this.model.displayTodoList.mapping;
  }

  get togglingItemId() {
    const action = this.model.toggleTodoItemAction;
    return action.isRunning ? action.arg?.[0] : undefined;
  }

  updateFilter(value: Partial<TodoItemFilter>) {
    const filter = this.model.appliedTodoListFilter;
    const newFilter = { ...filter.value, ...value };
    this.model.events.updateFilterEvent.emitOnce(newFilter);
  }

  refreshTodoList() {
    this.model.events.refreshTodoListEvent.emitOnce();
  }

  toggleTodoItem(id: string, completed: boolean): void {
    this.model.events.toggleTodoEvent.emitOnce([id, completed]);
  }

  removeTodoItem(id: string): void {
    this.model.events.deleteTodoEvent.emitOnce(id);
  }
}

const modernTodoListControllerContext =
  React.createContext<ModernTodoListFormController | null>(null);

export const useModernTodoListController = () => {
  const controller = React.useContext(modernTodoListControllerContext);
  if (!controller) {
    throw new Error('Controller not found');
  }
  return controller;
};

export const ModernTodoListFormControllerProvider =
  modernTodoListControllerContext.Provider;
