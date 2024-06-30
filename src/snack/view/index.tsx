import { useState } from 'react';
import { SnackGameController } from '../model';
import { observer } from 'mobx-react-lite';

import styles from './index.module.less';

const SnackGameView: React.FC = () => {
  const [controller] = useState(() => new SnackGameController());

  const handleGameStart = () => {
    controller.events.gameStartEvent.emitFunction();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.upper}>
        <h1>The Snack</h1>
        <button
          onClick={handleGameStart}
          disabled={controller.statistics.status.value === 'running'}
        >
          开始游戏
        </button>
      </div>
      <div className={styles.statistics}>
        <div>得分：{controller.statistics.score.value}</div>
        <div>游戏状态：{controller.statistics.status.value}</div>
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
            className={styles.snackBody}
            key={index}
            style={{
              ['--x' as string]: x,
              ['--y' as string]: y,
            }}
          ></div>
        ))}
        {controller.game.foods.value.map(([x, y], index) => (
          <div
            className={styles.snackFood}
            key={index}
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
