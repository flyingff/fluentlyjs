export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;
}

export type TodoCreateItem = Omit<TodoItem, 'id' | 'completed' | 'createdAt'>;

export interface TodoItemFilter {
  completed?: boolean;
  dueDate?: number;
  queryAt: number;
}
