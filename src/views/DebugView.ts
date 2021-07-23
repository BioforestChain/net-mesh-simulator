import * as PIXI from "pixi.js";

interface Color {
  color: number;
  alpah: number;
}
interface StopColor extends Color {
  start: number;
  stop: number;
}
const DASHED_COLORS: StopColor[] = [
  //   {
  //     color: 0xffffff,
  //     alpah: 1,
  //     start: 0,
  //     stop: 0.5,
  //   },
  {
    color: 0x0,
    alpah: 1,
    start: 0,
    stop: 0.5,
  },
];
export class DebugView extends PIXI.Container {
  //   private aniTicker = new PIXI.Ticker();
  private get aniTicker() {
    return this.app.ticker;
  }
  constructor(private app: PIXI.Application) {
    super();
    Reflect.set(self, "dv", this);
    this.addChild(this._aniDashLineView);

    const { aniTicker } = this;

    let accT = 0;
    const ACC_T = 60 / 5; // 一秒更新5帧率
    aniTicker.add((t) => {
      accT += t;
      if (accT > ACC_T) {
        const restAccT = accT % ACC_T;
        t = accT - restAccT;
        accT = restAccT;
      } else if (this._needForceRender) {
        this._needForceRender = false;
        // t = accT;
        t = 0;
        accT = 0;
      } else {
        return;
      }
      if (this._aniFuns.length) {
        // const st = performance.now();
        this.__aniViewClear();
        for (const aniFun of this._aniFuns) {
          aniFun(t);
        }
        // const et = performance.now();
        // const dt = et - st;
        // const curFPS = 1000 / dt;
        // if (curFPS < aniTicker.maxFPS) {
        //   const newMaxFPS = curFPS + (curFPS - aniTicker.maxFPS) / 2;
        //   const newMinFPS = newMaxFPS / 3;
        //   aniTicker.minFPS = newMinFPS;
        //   aniTicker.maxFPS = newMaxFPS;
        // }
      }
    });
  }
  public unitDashedLen = 20;
  public unitDashedSpeed = 0.01; // %/ms
  private _aniFuns: PIXI.TickerCallback<any>[] = [];
  private _aniDashLineView = new PIXI.Graphics();
  private _preUsedColor?: Color;
  private _useColor(color: Color) {
    if (this._preUsedColor !== color) {
      this._preUsedColor = color;
    } else {
      return;
    }
    this._aniDashLineView.lineStyle({
      color: color.color,
      alpha: color.alpah,
      width: 1,
      native: true,
    });
  }
  drawAniDashedLine(
    from: readonly [number, number],
    to: readonly [number, number]
  ) {
    const gView = this._aniDashLineView;
    const { unitDashedLen, unitDashedSpeed, aniTicker } = this;
    const [toX, toY] = to;
    const [fromX, fromY] = from;
    const diffX = toX - fromX;
    const diffY = toY - fromY;
    const totalLen = Math.sqrt(diffX ** 2 + diffY ** 2);
    const unitDiffX = (diffX / totalLen) * unitDashedLen;
    const unitDiffY = (diffY / totalLen) * unitDashedLen;
    let accOffset = 0;

    const aniFun: PIXI.TickerCallback<any> = (t) => {
      for (const stopColor of DASHED_COLORS) {
        this._useColor(stopColor);
        const colorLen = stopColor.stop - stopColor.start;
        let offsetX = fromX;
        let offsetY = fromY;
        offsetX += ((stopColor.start + accOffset) % 1) * unitDiffX;
        offsetY += ((stopColor.start + accOffset) % 1) * unitDiffY;

        for (
          ;
          (offsetX - fromX) / diffX <= 1;
          offsetX += unitDiffX, offsetY += unitDiffY
        ) {
          gView.moveTo(offsetX, offsetY);

          let lineToX = offsetX + colorLen * unitDiffX;
          let lineToY: number;
          /// 超出了
          if ((fromX - lineToX) / diffX > 1) {
            lineToX = toX;
            lineToY = toY;
          } else {
            lineToY = offsetY + colorLen * unitDiffY;
          }
          gView.lineTo(lineToX, lineToY);
        }
      }
      accOffset += t * unitDashedSpeed;
    };
    this._aniFuns.push(aniFun);
  }

  /**清空后，需要马上进行一次强制渲染，动画什么的可以慢一拍没关系 */
  private _needForceRender = false;
  private __aniViewClear() {
    this._aniDashLineView.clear();
    this._preUsedColor = undefined;
  }
  clear() {
    for (const aniFun of this._aniFuns) {
      this.aniTicker.remove(aniFun);
    }
    this._aniFuns.length = 0;
    this._needForceRender = true;
    return this.__aniViewClear();
  }
}
