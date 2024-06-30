import { Scope, ScopeDisposable, scopeDisposeSymbol } from '@/context';
import { EventSource } from '@/declarative';
import { ReducedValue } from '@/declarative/reducer';
import { autorun } from 'mobx';

type GameStatus = 'idle' | 'running' | 'pause' | 'over';

const directionChangeEvent = new EventSource<
  'up' | 'down' | 'left' | 'right'
>();

const GAME_TICK_INTERVAL = 500;
class SnackGameEvents {
  private timerId: number | null = null;

  public readonly eatFoodEvent;
  public readonly gameStartEvent;
  public readonly gameOverEvent;
  public readonly timeElapseEvent;

  public constructor(scope: Scope) {
    this.eatFoodEvent = new EventSource<void>(scope);
    this.gameStartEvent = new EventSource<void>(scope);
    this.gameOverEvent = new EventSource<void>(scope);
    this.timeElapseEvent = new EventSource<void>(scope);

    this.gameStartEvent.addEffect(() => this.startTimer());
    this.gameOverEvent.addEffect(() => this.stopTimer());
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
  bestScore: ReducedValue<number>;
  status: ReducedValue<GameStatus>;

  constructor(
    scope: Scope,
    { eatFoodEvent, gameStartEvent, gameOverEvent }: SnackGameEvents,
  ) {
    this.score = ReducedValue.builder<number>()
      .addReducer(eatFoodEvent, (score) => score + 1)
      .build(0);

    this.bestScore = ReducedValue.builder<number>()
      .addReducer(gameOverEvent, (bestScore) => {
        const score = this.score.value;
        return score > bestScore ? score : bestScore;
      })
      .build(0);

    this.status = ReducedValue.builder<GameStatus>()
      .addReducer(gameStartEvent, () => 'running')
      .addReducer(gameOverEvent, () => 'over')
      .build('idle');
  }
}

type MoveDirection = 'up' | 'down' | 'left' | 'right';

const width = 32;
const height = 32;

class SnackGameModel {
  public readonly direction: ReducedValue<MoveDirection>;
  public readonly body: ReducedValue<[x: number, y: number][]>;
  public readonly foods: ReducedValue<[x: number, y: number][]>;

  constructor(
    scope: Scope,
    {
      eatFoodEvent,
      gameStartEvent,
      gameOverEvent,
      timeElapseEvent,
    }: SnackGameEvents,
  ) {
    this.direction = ReducedValue.builder<MoveDirection>()
      .addReducer(directionChangeEvent, (_, direction) => direction)
      .addReducer(gameStartEvent, () => 'up')
      .build('up');

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
        const newHead = move(head, this.direction.value);

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
        if (body.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
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
