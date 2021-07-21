import { Point } from "./Point";

export abstract class BaseMatrixBroadcast<
  $BroadcastMatrix extends BM.BroadcastMatrix<Point>
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
