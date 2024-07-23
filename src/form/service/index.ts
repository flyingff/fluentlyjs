import { TodoCreateItem, TodoItem, TodoItemFilter } from '../model/typings';

const getRandomDelay = () => Math.floor(Math.random() * 1000) + 500;
const mockDelay = (ms = getRandomDelay()) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const todoListStorageKey = 'todo-list';

export const getTodoList = async (
  filter?: TodoItemFilter,
): Promise<TodoItem[]> => {
  await mockDelay();
  const todoList = localStorage.getItem(todoListStorageKey);
  const array: TodoItem[] = todoList ? JSON.parse(todoList) : [];

  if (!filter) {
    return array;
  }

  console.log(array, filter);

  return array.filter((item) => {
    if (filter.completed !== undefined && item.completed !== filter.completed) {
      return false;
    }
    if (filter.dueDate && (!item.dueDate || item.dueDate > filter.dueDate)) {
      return false;
    }
    return true;
  });
};

export const createTodoList = async (item: TodoCreateItem) => {
  const todoList = await getTodoList();
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  todoList.push({ ...item, id, completed: false, createdAt: Date.now() });
  localStorage.setItem(todoListStorageKey, JSON.stringify(todoList));
  return id;
};

export const updateTodoList = async (
  id: string,
  modifier: Partial<TodoItem>,
) => {
  const todoList = await getTodoList();
  const index = todoList.findIndex((i) => i.id === id);
  if (index === -1) {
    return false;
  }
  todoList[index] = Object.assign({}, todoList[index], modifier);
  localStorage.setItem(todoListStorageKey, JSON.stringify(todoList));
  return true;
};

export const deleteTodoList = async (id: string) => {
  const todoList = await getTodoList();
  const index = todoList.findIndex((i) => i.id === id);
  if (index === -1) {
    return false;
  }
  todoList.splice(index, 1);
  localStorage.setItem(todoListStorageKey, JSON.stringify(todoList));
  return true;
};
