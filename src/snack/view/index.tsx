import cx from 'classnames';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { SnackGameController } from '../model';

import styles from './index.module.less';

const SnackGameView: React.FC = () => {
  const [controller] = useState(() => new SnackGameController());

  const status = controller.statistics.status.value;

  const handleGameStart = () => {
    controller.events.gameStartEvent.emitFunction();
  };

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    // 监听键盘事件
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          controller.events.directionChangeEvent.emitFunction('up');
          break;
        case 'ArrowDown':
          controller.events.directionChangeEvent.emitFunction('down');
          break;
        case 'ArrowLeft':
          controller.events.directionChangeEvent.emitFunction('left');
          break;
        case 'ArrowRight':
          controller.events.directionChangeEvent.emitFunction('right');
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [controller, status]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.upper}>
        <h1>The Snack</h1>
        <button onClick={handleGameStart} disabled={status === 'running'}>
          开始游戏
        </button>
      </div>
      <div className={styles.statistics}>
        <div>得分：{controller.statistics.score.value}</div>
        <div>{controller.game.direction.value.nextMoveDirection}</div>
        <div>游戏状态：{status}</div>
      </div>
      <div
        className={styles.lower}
        style={{
          ['--rows' as string]: controller.game.height,
          ['--cols' as string]: controller.game.width,
        }}
      >
        {controller.game.body.value.map(([x, y], index) => (
          <div
            key={index}
            className={cx(styles.snackBody, { [styles.head]: index === 0 })}
            style={{
              ['--x' as string]: x,
              ['--y' as string]: y,
            }}
          ></div>
        ))}
        {controller.game.foods.value.map(([x, y], index) => (
          <div
            key={index}
            className={styles.snackFood}
            style={{
              ['--x' as string]: x,
              ['--y' as string]: y,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default observer(SnackGameView);
