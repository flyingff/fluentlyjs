import { makeAutoObservable } from 'mobx';
import { TodoManagerModel } from '../../model';
import { TodoCreateItem, TodoItemFilter } from '../../model/typings';
import { PopupFormModal } from '../../model/form';
import { TransientValue } from '../../model/display';
import React from 'react';

export class ClassicTodoListFormController {
  readonly model: TodoManagerModel;

  readonly displayFilter: TransientValue<TodoItemFilter>;

  readonly creatingForm: PopupFormModal<TodoCreateItem>;

  constructor() {
    this.model = TodoManagerModel.create();
    this.displayFilter = new TransientValue<TodoItemFilter>(
      this.model.appliedTodoListFilter,
    );
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

  applyFilter() {
    this.model.events.updateFilterEvent.emitOnce(this.displayFilter.value);
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

const classicTodoListControllerContext =
  React.createContext<ClassicTodoListFormController | null>(null);

export const useClassicTodoListController = () => {
  const controller = React.useContext(classicTodoListControllerContext);
  if (!controller) {
    throw new Error('Controller not found');
  }
  return controller;
};

export const ClassicTodoListFormControllerProvider =
  classicTodoListControllerContext.Provider;
