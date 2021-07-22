import { Point } from "./Point";

export abstract class BaseBroadcastMatrix<T extends BaseMatrixBroadcast>
  implements BM.BroadcastMatrix<Point> {
  public readonly connectedPoints = new Map<bigint, Point>();
  abstract readonly MB_CTOR: new (
    _martix: BaseBroadcastMatrix<T>,
    startPoint: Point,
    endPoint: Point,
    data: string
  ) => T;
  constructor(public readonly currentPoint: Point) {}
  addConntectedPoint(cpoint: Point) {
    const bi = cpoint.toBigInt();
    if (this.connectedPoints.has(bi)) {
      return false;
    }
    this.connectedPoints.set(bi, cpoint);
    return true;
  }

  /**
   * 开始一个广播任务
   * @param targetPoint 方向目标
   */
  startMartixBroadcast(startPoint: Point, endPoint: Point, data: string) {
    return new this.MB_CTOR(this, startPoint, endPoint, data);
  }
  //   removeConntectedPoint(cpoint:)
}

export abstract class BaseMatrixBroadcast<
  $BroadcastMatrix extends BM.BroadcastMatrix<Point> = BM.BroadcastMatrix<Point>
> implements BM.MatrixBroadcast<Point> {
  get currentPoint() {
    return this._martix.currentPoint;
  }
  constructor(
    protected _martix: $BroadcastMatrix,
    public readonly startPoint: Point,
    public readonly endPoint: Point,
    public data: string
  ) {
    this._init();
  }
  protected abstract _init(): unknown;
  abstract resolvePoint(point: BM.Point): BM.PromiseMaybe<boolean>;
  abstract rejectPoint(point: BM.Point): BM.PromiseMaybe<boolean>;
  abstract getNextPoint(): BM.PromiseMaybe<Point | undefined>;
}
