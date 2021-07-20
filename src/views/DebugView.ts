import * as PIXI from "pixi.js";
export class DebugView extends PIXI.Container {
  constructor(private aniTicker: PIXI.Ticker) {
    super();
    this.addChild(this._aniDashLineView);
    aniTicker.add((t) => {
      if (this._aniFuns.length) {
        this._aniDashLineView.clear();
        for (const aniFun of this._aniFuns) {
          aniFun(t);
        }
      }
    });
  }
  public unitDashedLen = 20;
  public unitDashedSpeed = 0.01; // %/ms
  private _aniFuns: PIXI.TickerCallback<any>[] = [];
  private _aniDashLineView = new PIXI.Graphics();
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

    type StopColor = {
      color: number;
      alpah: number;
      start: number;
      stop: number;
    };
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
        start: 0.5,
        stop: 1,
      },
    ];
    const useColor = (stopColor: StopColor) => {
      gView.lineStyle({
        color: stopColor.color,
        alpha: stopColor.alpah,
        width: 1,
        native: true,
      });
    };
    const aniFun: PIXI.TickerCallback<any> = (t) => {
      for (const stopColor of DASHED_COLORS) {
        useColor(stopColor);
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
  clear() {
    for (const aniFun of this._aniFuns) {
      this.aniTicker.remove(aniFun);
    }
    this._aniFuns.length = 0;
    return this._aniDashLineView.clear();
  }
}
