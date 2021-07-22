import "./@types";
import { BaseBroadcastMatrix, BaseMatrixBroadcast } from "./mb";
import { Evt } from "./evt";
import { Point } from "./Point";

export class RandomBroadcastMatrix extends BaseBroadcastMatrix<
  MatrixBroadcast
> {
  readonly MB_CTOR = MatrixBroadcast;
}

/**洗牌算法
 * @param chaos 混乱系数N意味着洗牌N次
 */
function randomArray<T>(arr: T[], chaos = Math.sqrt(arr.length)) {
  const len = arr.length;
  for (let i = 0; i < chaos; ++i) {
    const splitIndex = Math.floor(Math.random() * len);
    // 切牌, 等同于 arr.splice(0, 0, ...arr.slice(splitIndex));
    arr = arr
      .slice(splitIndex)
      .reverse()
      .concat(arr);
    arr.length = len;
  }
  return arr;
}

export class MatrixBroadcast extends BaseMatrixBroadcast<
  RandomBroadcastMatrix
> {
  protected _init() {
    // 随机排序所有节点
    const allPointList = randomArray(
      [...this._martix.connectedPoints.values()],
      Math.sqrt(this._martix.connectedPoints.size) * 2
    );

    this._bc = this.doBroadcast(allPointList);
  }
  private _hasResolved(point: Point) {
    return this.resolvedPointIds.has(point.toBigInt());
  }
  private resolvedPointIds = new Set<bigint>();
  resolvePoint(point: Point) {
    this.resolvedPointIds.add(point.toBigInt());
    return true;
  }
  private rejectedPointIds = new Set<bigint>();
  rejectPoint(point: Point) {
    this.rejectedPointIds.add(point.toBigInt());
    return true;
  }

  readonly onSkipMinPointId = new Evt<number>();
  async *doBroadcast(allPointList: Array<Point>) {
    do {
      for (const point of allPointList) {
        if (this._hasResolved(point)) {
          continue;
        }
        yield point;
      }
    } while (this.rejectedPointIds.size > 0);
  }
  private _bc!: AsyncGenerator<Point>;
  async getNextPoint() {
    const item = await this._bc.next();
    if (item.done) {
      return;
    }
    return item.value;
  }
}
