import { observer } from 'mobx-react-lite';
import cx from 'classnames';

import styles from './index.module.less';
import { useModernTodoListController } from '../../controller';
import { ReloadOutlined } from '@ant-design/icons';

const FilterButton: React.FC<{
  children: string;
  selected?: boolean;
  loading?: boolean;
  onClick?: () => void;
}> = ({ children, selected, loading, onClick }) => {
  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };
  return (
    <div
      className={cx(styles.filterButton, {
        [styles.active]: selected,
        [styles.loading]: loading,
      })}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

const TodoHeader: React.FC = observer(() => {
  const controller = useModernTodoListController();
  const activeFilter = controller.model.appliedTodoListFilter.value;
  const switchDisabled = controller.model.displayTodoList.mapping;

  const handleSwitchToAll = () => {
    controller.updateFilter({ completed: undefined });
  };
  const handleSwitchToCompleted = () => {
    controller.updateFilter({ completed: true });
  };
  const handleSwitchToUncompleted = () => {
    controller.updateFilter({ completed: false });
  };
  const handleReload = () => {
    if (switchDisabled) {
      return;
    }
    controller.refreshTodoList();
  };

  return (
    <>
      <h1 className={styles.title}>
        <span>我的待办</span>
        <div
          className={cx(styles.btnReload, {
            [styles.loading]: switchDisabled,
          })}
          onClick={handleReload}
        >
          <ReloadOutlined />
        </div>
      </h1>
      <div className={styles.filterButtonWrapper}>
        <FilterButton
          selected={typeof activeFilter.completed !== 'boolean'}
          loading={switchDisabled}
          onClick={handleSwitchToAll}
        >
          全部
        </FilterButton>
        <FilterButton
          selected={activeFilter.completed === true}
          loading={switchDisabled}
          onClick={handleSwitchToCompleted}
        >
          已完成
        </FilterButton>
        <FilterButton
          selected={activeFilter.completed === false}
          loading={switchDisabled}
          onClick={handleSwitchToUncompleted}
        >
          未完成
        </FilterButton>
      </div>
    </>
  );
});

export default TodoHeader;
