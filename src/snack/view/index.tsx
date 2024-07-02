import cx from 'classnames';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { SnackGameController } from '../model';

import styles from './index.module.less';

const SnackHeaderView = observer(
  ({ controller }: { controller: SnackGameController }) => {
    const status = controller.statistics.status.value;

    const handleGameStart = () => {
      controller.events.gameStartEvent.emitFunction();
    };

    return (
      <div className={styles.upper}>
        <h1>The Snack</h1>
        <button onClick={handleGameStart} disabled={status === 'running'}>
          开始游戏
        </button>
      </div>
    );
  },
);

const SnackStatisticsView = observer(
  ({ controller }: { controller: SnackGameController }) => {
    const status = controller.statistics.status.value;
    const synchronizingScore = controller.statistics.bestScore.mapping;

    const uploadingScore =
      controller.statistics.updateBestScoreAction.state === 'running';
    const handleUploadBestScore = () => {
      controller.statistics.updateBestScoreAction.run();
    };

    return (
      <div className={styles.statistics}>
        <div>得分： {controller.statistics.score.value}</div>
        <div>
          最高得分:
          {synchronizingScore ? '...' : controller.statistics.bestScore.value}
          <button onClick={handleUploadBestScore} disabled={uploadingScore}>
            {uploadingScore ? '上传中' : '上传最高得分'}
          </button>
        </div>
        <div>{controller.game.direction.value.nextMoveDirection}</div>
        <div>游戏状态：{status}</div>
      </div>
    );
  },
);

const SnackGridView = observer(
  ({ controller }: { controller: SnackGameController }) => {
    return (
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
    );
  },
);

const SnackGameView: React.FC = () => {
  const [controller] = useState(() => new SnackGameController());
  const status = controller.statistics.status.value;

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    // 监听键盘事件
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          controller.events.directionChangeEvent.emitFunction('up');
          event.preventDefault();
          break;
        case 'ArrowDown':
          controller.events.directionChangeEvent.emitFunction('down');
          event.preventDefault();
          break;
        case 'ArrowLeft':
          controller.events.directionChangeEvent.emitFunction('left');
          event.preventDefault();
          break;
        case 'ArrowRight':
          controller.events.directionChangeEvent.emitFunction('right');
          event.preventDefault();
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
      <SnackHeaderView controller={controller} />
      <SnackStatisticsView controller={controller} />
      <SnackGridView controller={controller} />
    </div>
  );
};

export default observer(SnackGameView);
