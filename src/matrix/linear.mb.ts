import "./@types";
import { BaseBroadcastMatrix, BaseMatrixBroadcast } from "./mb";
import { Evt } from "./evt";
import { Point } from "./Point";

export class LinearBroadcastMatrix extends BaseBroadcastMatrix<
  MatrixBroadcast
> {
  readonly MB_CTOR = MatrixBroadcast;
}

interface PointDetail {
  point: Point;
  value: bigint;
}

export class MatrixBroadcast extends BaseMatrixBroadcast<
  LinearBroadcastMatrix
> {
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
