import React, { useState } from 'react';
import {
  ModernTodoListFormController,
  ModernTodoListFormControllerProvider,
} from './controller';

import { observer } from 'mobx-react-lite';

import styles from './index.module.less';
import CreatePage from './component/CreatePage';
import Header from './component/Header';
import TodoBoard from './component/TodoBoard';

const TodoListOverall: React.FC = () => {
  const [controller] = useState(() => new ModernTodoListFormController());

  return (
    <ModernTodoListFormControllerProvider value={controller}>
      <div className={styles.wrapper}>
        <Header />
        <TodoBoard />
        <CreatePage />
      </div>
    </ModernTodoListFormControllerProvider>
  );
};

export default observer(TodoListOverall);
