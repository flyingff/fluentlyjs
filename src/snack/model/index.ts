import { Scope, ScopeDisposable, scopeDisposeSymbol } from '@/context';
import { EventSource } from '@/declarative';
import { AsyncMap } from '@/declarative/asyncMap';
import { ReducedValue } from '@/declarative/reducer';
import { makeAutoObservable } from 'mobx';
import { getHighestScore, reportScore } from '../service/score';
import { Action } from '@/declarative/action';

type GameStatus = 'idle' | 'running' | 'pause' | 'over';

const GAME_TICK_INTERVAL = 200;
class SnackGameEvents {
  private timerId: number | null = null;

  public readonly eatFoodEvent;
  public readonly gameStartEvent;
  public readonly gameOverEvent;
  public readonly timeElapseEvent;
  public readonly directionChangeEvent;

  public constructor(scope: Scope) {
    this.eatFoodEvent = new EventSource<void>(scope);
    this.gameStartEvent = new EventSource<void>(scope);
    this.gameOverEvent = new EventSource<void>(scope);
    this.timeElapseEvent = new EventSource<void>(scope);
    this.directionChangeEvent = new EventSource<
      'up' | 'down' | 'left' | 'right'
    >();

    const startTimerAction = new Action(() => this.startTimer());
    const stopTimerAction = new Action(() => this.stopTimer());

    startTimerAction.runOn(this.gameStartEvent, () => {});
    stopTimerAction.runOn(this.gameOverEvent, () => {});
  }

  public startTimer() {
    if (this.timerId !== null) {
      return;
    }
    this.timerId = window.setInterval(() => {
      this.timeElapseEvent.emitFunction();
    }, GAME_TICK_INTERVAL);
  }

  public stopTimer() {
    if (this.timerId === null) {
      return;
    }
    window.clearInterval(this.timerId);
    this.timerId = null;
  }
}

class GameStatisticsModel {
  score: ReducedValue<number>;
  status: ReducedValue<GameStatus>;
  bestScoreRefreshTime: ReducedValue<number>;
  bestScore: AsyncMap<number, number>;
  updateBestScoreAction: Action<void>;

  constructor(
    _scope: Scope,
    { eatFoodEvent, gameStartEvent, gameOverEvent }: SnackGameEvents,
  ) {
    this.score = ReducedValue.builder<number>()
      .addReducer(eatFoodEvent, (score) => score + 1)
      .build(0);

    this.status = ReducedValue.builder<GameStatus>()
      .addReducer(gameStartEvent, () => 'running')
      .addReducer(gameOverEvent, () => 'over')
      .build('idle');

    this.bestScoreRefreshTime = ReducedValue.builder<number>()
      .addReducer(gameOverEvent, () => Date.now())
      .build(0);

    this.updateBestScoreAction = new Action(() => {
      return reportScore(this.score.value);
    });
    this.updateBestScoreAction.runOn(gameOverEvent, () => {});

    this.bestScore = new AsyncMap(
      () => this.bestScoreRefreshTime,
      async () => {
        return getHighestScore();
      },
      0,
    );
  }
}

type MoveDirection = 'up' | 'down' | 'left' | 'right';
interface MoveInfo {
  lastMoveDirection: MoveDirection;
  nextMoveDirection: MoveDirection;
}

const width = 32;
const height = 32;

class SnackGameModel {
  public readonly direction: ReducedValue<MoveInfo>;
  public readonly body: ReducedValue<[x: number, y: number][]>;
  public readonly foods: ReducedValue<[x: number, y: number][]>;

  constructor(
    _scope: Scope,
    {
      eatFoodEvent,
      gameStartEvent,
      gameOverEvent,
      timeElapseEvent,
      directionChangeEvent,
    }: SnackGameEvents,
  ) {
    // 判断两个方向是否是可以兼容的，比如说向上的时候不能向下，否则会直接撞自己而结束游戏
    function directionCompatible(prev: MoveDirection, next: MoveDirection) {
      return (
        (prev === 'up' && next !== 'down') ||
        (prev === 'down' && next !== 'up') ||
        (prev === 'left' && next !== 'right') ||
        (prev === 'right' && next !== 'left')
      );
    }

    this.direction = ReducedValue.builder<MoveInfo>()
      .addReducer(directionChangeEvent, (info, newDirection) => {
        if (!directionCompatible(info.lastMoveDirection, newDirection)) {
          return info;
        }

        return {
          ...info,
          nextMoveDirection: newDirection,
        };
      })
      .addReducer(gameStartEvent, () => ({
        lastMoveDirection: 'up',
        nextMoveDirection: 'up',
      }))
      .addReducer(timeElapseEvent, (info) => ({
        ...info,
        lastMoveDirection: info.nextMoveDirection,
      }))
      .build({ lastMoveDirection: 'up', nextMoveDirection: 'up' });

    this.body = ReducedValue.builder<[x: number, y: number][]>()
      .addReducer(gameStartEvent, () => [[width / 2, height / 2]])
      .addReducer(timeElapseEvent, (body) => {
        function move(
          [x, y]: [number, number],
          direction: MoveDirection,
        ): [number, number] {
          switch (direction) {
            case 'up':
              return [x, y - 1];
            case 'down':
              return [x, y + 1];
            case 'left':
              return [x - 1, y];
            case 'right':
              return [x + 1, y];
          }
        }
        const [head] = body;
        const newHead = move(head, this.direction.value.nextMoveDirection);

        // 判断是否撞墙
        if (
          newHead[0] < 0 ||
          newHead[0] >= width ||
          newHead[1] < 0 ||
          newHead[1] >= height
        ) {
          gameOverEvent.emitFunction();
          return body;
        }

        // 判断是否撞自己
        if (
          body
            .slice(0, -1)
            .some(([x, y]) => x === newHead[0] && y === newHead[1])
        ) {
          gameOverEvent.emitFunction();
          return body;
        }

        const foods = this.foods.value;
        // 判断是否吃到食物
        if (foods.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
          eatFoodEvent.emitFunction();
          foods.pop();
          return [newHead, ...body];
        } else {
          return [newHead, ...body.slice(0, -1)];
        }
      })
      .build([]);

    const generateRandomEmptyPosition = (): [x: number, y: number] => {
      // TODO: 这个算法有问题，当食物占满整个地图的时候，会陷入死循环
      // 不过这个问题在这个小游戏里面不太可能出现，所以就先不管了

      // 生成一个随机的位置
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      // 判断这个位置是否已经被占用
      if (this.body.value.some(([x1, y1]) => x1 === x && y1 === y)) {
        return generateRandomEmptyPosition();
      }
      // 判断这个位置是否已经有食物
      if (this.foods.value.some(([x1, y1]) => x1 === x && y1 === y)) {
        return generateRandomEmptyPosition();
      }
      // 返回这个位置
      return [x, y];
    };

    // 暂时先生成一个食物，后续会在游戏开始和吃掉食物的时候再随机生成
    this.foods = ReducedValue.builder<[x: number, y: number][]>()
      .addReducer(gameStartEvent, () => [generateRandomEmptyPosition()])
      .addReducer(eatFoodEvent, () => [generateRandomEmptyPosition()])
      .build([]);
  }

  public get width() {
    return width;
  }

  public get height() {
    return height;
  }
}

class SnackGameController implements ScopeDisposable {
  public readonly scope = new Scope();
  public readonly events = new SnackGameEvents(this.scope);

  public readonly statistics = new GameStatisticsModel(this.scope, this.events);
  public readonly game = new SnackGameModel(this.scope, this.events);

  [scopeDisposeSymbol](): void {
    this.scope[scopeDisposeSymbol]();
  }
}

export { SnackGameController };
