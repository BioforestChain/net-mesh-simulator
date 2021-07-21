import "./@types";
import { BaseMatrixBroadcast } from "./mb";
import { Evt } from "./evt";
import { Point } from "./Point";
export class BroadcastMatrix implements BM.BroadcastMatrix<Point> {
  public readonly connectedPoints = new Map<bigint, Point>();
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
    return new MatrixBroadcast(this, startPoint, endPoint, data);
  }
  //   removeConntectedPoint(cpoint:)
}

interface PointDetail {
  point: Point;
  value: bigint;
}

export class MatrixBroadcast extends BaseMatrixBroadcast<BroadcastMatrix> {
  protected _init() {
    const allPointDetailList: PointDetail[] = [];
    for (const point of this._martix.connectedPoints.values()) {
      allPointDetailList.push({
        point,
        value: point.toBigInt(),
      });
    }
    /// 从小到大排序
    allPointDetailList.sort((a, b) => {
      return Number(a.value - b.value);
    });

    /// 找到比自己大的，将它们放到后面去广播
    const currentValue = this.currentPoint.toBigInt();
    const index = allPointDetailList.findIndex(
      (pd) => pd.value >= currentValue
    );
    if (index > 0) {
      const smallPdList = allPointDetailList.splice(0, index);
      allPointDetailList.push(...smallPdList);
    }

    this.allPointDetailList = allPointDetailList;

    this._bc = this.doBroadcast(allPointDetailList);
  }
  private allPointDetailList!: Array<PointDetail>;
  private _hasResolved(pointDetail: PointDetail) {
    return this.resolvedPointIds.has(pointDetail.value);
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
  async *doBroadcast(sortedAllPointDetailList: Array<PointDetail>) {
    do {
      for (const pointDetail of sortedAllPointDetailList) {
        if (this._hasResolved(pointDetail)) {
          continue;
        }
        yield pointDetail.point;
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
