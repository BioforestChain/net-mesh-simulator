import "./@types";
import { Evt } from "./evt";
import { Point } from "./Point";
import { BaseMatrixBroadcast } from "./mb";
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

type PointDetail = {
  point: Point;
  pointId: bigint;
  distance: number;
  angle: number;
  minPointId: number;
};
type MinPointDetail = {
  minPoint: Point;
  minPointId: number;
  minDistance: number;
  minAngle: number;
};

export class MatrixBroadcast extends BaseMatrixBroadcast<BroadcastMatrix> {
  protected _init() {
    const gridSize = 4;
    const { currentPoint, endPoint } = this;
    const directionVector = currentPoint.makeVector(endPoint);

    /**
     * 所有解析过后的point索引
     */
    const allPointDetailMap = new Map<bigint, PointDetail>();
    /**
     * 根据minPointId进行分组
     */
    const groupedPointDetailList = new Map<number, PointDetail[]>();

    /**用于缓存minPointId与minPoint */
    const minPointCacheList: Point[] = [];

    /// 构建level2的结构
    const MAX_DISTANCE = this._martix.currentPoint.edgeSize * Math.SQRT2;
    const MAX_ANGLE = Math.PI;
    for (const point of this._martix.connectedPoints.values()) {
      const distance = Math.sqrt(
        point.calcDistancePow2(currentPoint) + point.calcDistancePow2(endPoint)
      );
      const vectorA = currentPoint.makeVector(point);
      const angle = vectorA.calcAngle(directionVector);

      const minPoint = point.minPoint(gridSize);
      const minPointId = minPoint.toNumber();
      minPointCacheList[minPointId] = minPoint;

      const pointDetail = {
        point,
        pointId: point.toBigInt(),
        distance: distance / MAX_DISTANCE,
        angle: angle / MAX_ANGLE,

        minPoint,
        minPointId,
      };

      allPointDetailMap.set(pointDetail.pointId, pointDetail);
      /// 现在将它们归入棋盘中
      let cellPointList = groupedPointDetailList.get(minPointId);
      if (!cellPointList) {
        cellPointList = [];
        groupedPointDetailList.set(minPointId, cellPointList);
      }
      cellPointList.push(pointDetail);
    }
    this.allPointDetailMap = allPointDetailMap;

    /// 构建level1的结构
    for (const cellPointList of groupedPointDetailList.values()) {
      cellPointList.sort((a, b) => {
        /// 在同一个棋盘内，角度优先，然后是距离，占比6/4开
        return (a.angle - b.angle) * 6 + (a.distance - b.distance) * 4;
      });
    }
    /// 对棋盘进行排序
    const allMinPointList = [...groupedPointDetailList.keys()].map(
      (minPointId) => minPointCacheList[minPointId]
    );
    /// 排序后构建成一个有序的数组
    const allMinPointDetailList: MinPointDetail[] = [];
    const endMinPoint = endPoint.minPoint(gridSize);
    const startMinPoint = currentPoint.minPoint(gridSize);
    const minDirectionVector = startMinPoint.makeVector(endMinPoint);
    const MAX_MINDISTANCE = endPoint.edgeSize * Math.SQRT2;
    for (const minPoint of allMinPointList) {
      const minDistance = Math.sqrt(
        minPoint.calcDistancePow2(currentPoint) +
          minPoint.calcDistancePow2(endPoint)
      );
      const minVectorA = startMinPoint.makeVector(minPoint);
      const minAngle = minVectorA.calcAngle(minDirectionVector);
      allMinPointDetailList.push({
        minPoint,
        minPointId: minPoint.toNumber(),
        minAngle: minAngle / MAX_ANGLE,
        minDistance: minDistance / MAX_MINDISTANCE,
      });
    }
    allMinPointDetailList.sort((a, b) => {
      /// 在同一个棋盘内，角度优先，然后是距离，占比6/4开
      return (
        (a.minAngle - b.minAngle) * 6 + (a.minDistance - b.minDistance) * 4
      );
    });
    this.allMinPointDetailMap = new Map(
      allMinPointDetailList.map((mpd) => [mpd.minPointId, mpd])
    );

    this.todoTasks = new Map(
      allMinPointDetailList.map((minPointDetail) => [
        minPointDetail,
        new Set(groupedPointDetailList.get(minPointDetail.minPointId)!),
      ])
    );

    this._bc = this.doBroadcast(this.todoTasks);
  }
  private allPointDetailMap!: ReadonlyMap<bigint, PointDetail>;
  private allMinPointDetailMap!: ReadonlyMap<number, MinPointDetail>;
  private todoTasks!: ReadonlyMap<MinPointDetail, ReadonlySet<PointDetail>>;
  private resolvedPointIds = new Map<number, Set<bigint>>();
  private _hasResolved(pointDetail: PointDetail) {
    const pointDetails = this.resolvedPointIds.get(pointDetail.minPointId);
    if (pointDetails) {
      return pointDetails.has(pointDetail.pointId);
    }
    return false;
  }
  private rejectedPointIds = new Set<bigint>();
  resolvePoint(point: Point) {
    const pointDetail = this._getPointDetailByPointId(point.toBigInt());
    if (!pointDetail) {
      return false;
    }
    let pointDetails = this.resolvedPointIds.get(pointDetail.minPointId);
    if (!pointDetails) {
      pointDetails = new Set();
      this.resolvedPointIds.set(pointDetail.minPointId, pointDetails);
    }
    pointDetails.add(pointDetail.pointId);

    // const pointId = point.toBigInt();
    // const detail = this.allPointDetailMap.get(pointId);
    // if (!detail) {
    //   return false;
    // }
    // const cellPoints = this.todoTasks.get(detail.minPointId);
    // if (!cellPoints) {
    //   return false;
    // }
    // return cellPoints.delete(pointId);
    return true;
  }
  rejectPoint(point: Point) {
    this.rejectedPointIds.add(point.toBigInt());
    return true;
    // const pointId = point.toBigInt();
    // const detail = this.allPointDetailMap.get(pointId);
    // if (!detail) {
    //   return false;
    // }
    // const cellPoints = this.todoTasks.get(detail.minPointId);
    // if (!cellPoints) {
    //   return false;
    // }
    // if (cellPoints.has(pointId)) {
    //   return false;
    // }
    // cellPoints.add(pointId);
    // return true;
  }
  private _getPointDetailByPointId(pointId: bigint) {
    return this.allPointDetailMap.get(pointId);
  }
  private _getMinPointByMinPointId(minPointId: number) {
    return this.allMinPointDetailMap.get(minPointId);
  }

  readonly onSkipMinPointId = new Evt<number>();
  private _level = 1;
  async *doBroadcast(
    allTasks: ReadonlyMap<MinPointDetail, ReadonlySet<PointDetail>>
  ) {
    do {
      this._level = 1;
      let skipedMinPointDetail: MinPointDetail | undefined;
      const finishedPds = new Set<PointDetail>();
      /// 先做一级遍历
      for (const [minPointDetail, sortedPointDetails] of allTasks) {
        if (skipedMinPointDetail !== undefined) {
          if (
            minPointDetail.minDistance <= skipedMinPointDetail.minDistance &&
            minPointDetail.minAngle >= skipedMinPointDetail.minAngle
          ) {
            this.onSkipMinPointId.emit(minPointDetail.minPointId);
            continue;
          }
        }
        for (const pointDetail of sortedPointDetails) {
          if (this._hasResolved(pointDetail)) {
            /// 如果已经收到这个格子的广播，那么跳过距离小于等于且方向大于等于这个格子的其它格子
            skipedMinPointDetail = minPointDetail;
            this.onSkipMinPointId.emit(minPointDetail.minPointId);
            break;
          }
          yield pointDetail.point;
          finishedPds.add(pointDetail);
          break;
        }
      }
      this._level = 2;
      /// 再做二级遍历
      for (const sortedPointDetails of allTasks.values()) {
        for (const pointDetail of sortedPointDetails) {
          if (finishedPds.has(pointDetail)) {
            continue;
          }
          if (this._hasResolved(pointDetail)) {
            continue;
          }
          yield pointDetail.point;
          finishedPds.add(pointDetail);
        }
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
