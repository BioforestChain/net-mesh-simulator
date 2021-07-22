import { Point } from "./Point";
import { PromiseOut } from "@bfchain/util-extends-promise-out";

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
    queueMicrotask(async () => {
      try {
        this._bcpo.resolve(await this._init());
      } catch (err) {
        this._bcpo.reject(err);
      }
    });
  }
  protected abstract _init(): BM.PromiseMaybe<AsyncGenerator<Point>>;

  hasResolvedPoint(point: Point) {
    return this._resolvedPointIds.has(point.toBigInt());
  }
  protected _resolvedPointIds = new Set<bigint>();
  resolvePoint(point: Point) {
    this._resolvedPointIds.add(point.toBigInt());
    return true;
  }
  protected _rejectedPointIds = new Set<bigint>();
  rejectPoint(point: Point) {
    this._rejectedPointIds.add(point.toBigInt());
    return true;
  }

  //   abstract getNextPoint(): BM.PromiseMaybe<Point | undefined>;
  private _bcpo = new PromiseOut<AsyncGenerator<Point>>();
  async getNextPoint() {
    const bc = this._bcpo.value || (await this._bcpo.promise);
    const item = await bc.next();
    if (item.done) {
      return;
    }
    return item.value;
  }
}
