import "./@types";
import { BaseBroadcastMatrix, BaseMatrixBroadcast } from "./mb";
import { Evt } from "./evt";
import { Point } from "./Point";

export class FibonacciBroadcastMatrix extends BaseBroadcastMatrix<
  MatrixBroadcast
> {
  readonly MB_CTOR = MatrixBroadcast;
}

interface PointDetail {
  point: Point;
  fibValue: number;
}

export class MatrixBroadcast extends BaseMatrixBroadcast<
  FibonacciBroadcastMatrix
> {
  private getFibValue(point: Point) {
    return point.toNumber() + 1;
  }
  protected _init() {
    // 排序所有节点，包括自己
    const allPointDetailList = [
      this.currentPoint,
      ...this._martix.connectedPoints.values(),
    ]
      .map((point) => {
        return {
          point,
          fibValue: this.getFibValue(point),
        } as PointDetail;
      })
      .sort((a, b) => a.fibValue - b.fibValue);

    return this.doBroadcast(allPointDetailList);
  }

  async *doBroadcast(allPointDetailList: Array<PointDetail>) {
    /**自己在整个节点列表中的位置 */
    const currentValue = this.getFibValue(this.currentPoint);

    /// 找到当前节点，在理想情况下，是在什么时候接收到广播的
    let fib = 1;
    while (currentValue > fib) {
      fib += fib; //  进行一次广播，那么全网中有多少节点拥有数据了？那么这些节点在下一次广播时也会参与进来广播
    }

    /// 接下来，自己要成为接下来广播要参与的节点之一，根据不重叠的规律，来进行广播
    const MAX_FIB_VALUE = this.currentPoint.edgeSize ** 2;
    const LoopValue = (fibVal: number) => {
      if (fibVal > MAX_FIB_VALUE) {
        fibVal = ((fibVal - 1) % MAX_FIB_VALUE) + 1;
      }
      return fibVal;
    };

    do {
      /// 根据我的位置，找到属于我的任务
      const myJobValue = LoopValue(fib + currentValue);
      /// 从我的节点表中，找出最接近我的任务的未广播的节点
      for (const nearestPoint of this._nearestJobPointDetail(
        allPointDetailList,
        myJobValue
      )) {
        if (
          this.hasResolvedPoint(nearestPoint) ||
          nearestPoint === this.currentPoint ||
          nearestPoint === this.startPoint
        ) {
          continue;
        }
        yield nearestPoint;
        break;
      }

      fib = LoopValue(fib + fib);

      /// 这里假设节点表不是动态变更的，所以可以这样简单比对数量。否则应该计算交际是否完全涵盖了后者
    } while (this._resolvedPointIds.size < this._martix.connectedPoints.size);
  }

  /**寻找最接近这个jobValue的节点，这里假设allPointDetailList是个大数组，所以才使用迭代器，避免性能浪费 */
  private *_nearestJobPointDetail(
    sortedPointDetailList: Array<PointDetail>,
    jobValue: number
  ) {
    /// 找到分水岭，从分水岭开始寻找左右两边的节点
    let rightIndex = sortedPointDetailList.findIndex(
      (pd) => pd.fibValue >= jobValue
    );
    let leftIndex = rightIndex - 1;
    const endIndex = sortedPointDetailList.length - 1;
    if (rightIndex === -1) {
      leftIndex = endIndex;
      rightIndex = endIndex + 1;
    }

    /// 循环直到某一边先循环完了
    while (leftIndex >= 0 && rightIndex <= endIndex) {
      const leftPd = sortedPointDetailList[leftIndex];
      const rightPd = sortedPointDetailList[rightIndex];
      if (rightPd.fibValue - jobValue <= jobValue - leftPd.fibValue) {
        yield rightPd.point;
        rightIndex += 1;
      } else {
        yield leftPd.point;
        leftIndex -= 1;
      }
    }
    /// 循环放出剩下的一边
    while (leftIndex >= 0) {
      yield sortedPointDetailList[leftIndex].point;
      leftIndex -= 1;
    }
    while (rightIndex <= endIndex) {
      yield sortedPointDetailList[rightIndex].point;
      rightIndex += 1;
    }
  }
}
