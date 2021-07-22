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

    return this.doBroadcast(allPointDetailList);
  }
  public allPointDetailList!: Array<PointDetail>;

  async *doBroadcast(sortedAllPointDetailList: Array<PointDetail>) {
    do {
      for (const pointDetail of sortedAllPointDetailList) {
        if (this.hasResolvedPoint(pointDetail.point)) {
          continue;
        }
        yield pointDetail.point;
      }
    } while (this._rejectedPointIds.size > 0);
  }
}
