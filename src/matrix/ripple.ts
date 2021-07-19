import "./@types";
import { Evt } from "./evt";
class Point implements BM.Point {
  constructor(
    public readonly x: number,
    public readonly y: number,
    /* 默认是16位，也就是说x与y的范围是 [0~2**16) */
    public readonly radix = 16
  ) {}
  private _bi?: bigint;
  toBigInt() {
    if (this._bi === undefined) {
      this._bi = (BigInt(this.x) << BigInt(this.radix)) + BigInt(this.y);
    }
    return this._bi;
  }
  private _n?: number;
  toNumber() {
    if (this._n === undefined) {
      this._n = (this.x << this.radix) + this.y;
    }
    return this._n;
  }
  calcDistancePow2(point: BM.Point) {
    return (this.x - point.x) ** 2 + (this.y - point.y) ** 2;
  }
  calcDistance(point: BM.Point) {
    return Math.sqrt(this.calcDistancePow2(point));
  }
  toPointVector(toPoint: BM.Point) {
    return new Vector(toPoint.x - this.x, toPoint.y - this.y, this.radix);
  }
  /**
   *
   * @param OPEN_MAX 不包含的最大值，比如64，那就是0~63
   * @returns
   */
  min(OPEN_MAX: number) {
    const CUR_MAX = 2 ** this.radix;
    return {
      x: Math.floor((this.x / CUR_MAX) * OPEN_MAX),
      y: Math.floor((this.y / CUR_MAX) * OPEN_MAX),
    };
  }
  minPoint(OPEN_MAX: number, radix: number) {
    const { x, y } = this.min(OPEN_MAX);
    return new Point(x, y, radix);
  }
}
class Vector extends Point {
  calcAngle(vector: Vector) {
    const a = this;
    const b = vector;
    const a_dot_b = a.x * b.x + a.y * b.y;
    const a_len = a.length;
    const b_len = b.length;
    const cos_a_b = a_dot_b / (a_len * b_len);
    return Math.acos(cos_a_b);
  }
  private _len?: number;
  get length() {
    if (this._len === undefined) {
      this._len = this.calcDistance({ x: 0, y: 0 });
    }
    return this._len;
  }
}

class BroadcastMatrix implements BM.BroadcastMatrix {
  public readonly connectedPoints = new Map<bigint, Point>();
  constructor(public readonly startPoint: Point) {}
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
  startMartixBroadcast(direction: Point, taskId?: string) {
    return new MatrixBroadcast(this, direction, taskId);
  }
  //   removeConntectedPoint(cpoint:)
}

// class MatrixPoint {
//   public readonly x: number;
//   public readonly y: number;
//   constructor(
//     public readonly point: Point,
//     public readonly matrixSize: number
//   ) {
//     const POINT_MAX = 2 ** this.point.radix;
//     this.x = Math.floor((this.point.x / POINT_MAX) * this.matrixSize);
//     this.y = Math.floor((this.point.y / POINT_MAX) * this.matrixSize);
//     this._int = this.x + this.y * this.matrixSize;
//   }
//   private _int: number;
//   toInt() {
//     return this._int;
//   }
// }

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

class MatrixBroadcast implements BM.MartixBroadcast {
  public readonly gridRadix: number = 6;
  public readonly gridSize: number = 1 << this.gridRadix;
  constructor(
    private _martix: BroadcastMatrix,
    public readonly endPoint: Point,
    public taskId?: string
  ) {
    const startPoint = this._martix.startPoint;
    const { gridSize, gridRadix } = this;
    const directionVector = startPoint.toPointVector(endPoint);

    /// 排序后构建成一个有序的数组
    const allPointDetailList: PointDetail[] = [];
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

    for (const point of this._martix.connectedPoints.values()) {
      const distance = Math.sqrt(
        point.calcDistancePow2(startPoint) +
          point.calcDistancePow2(this.endPoint)
      );
      const vectorA = startPoint.toPointVector(point);
      const angle = vectorA.calcAngle(directionVector);

      const minPoint = point.minPoint(gridSize, gridRadix);
      const minPointId = minPoint.toNumber();
      minPointCacheList[minPointId] = minPoint;

      const pointDetail = {
        point,
        pointId: point.toBigInt(),
        distance,
        angle,

        minPoint,
        minPointId,
      };
      allPointDetailList.push(pointDetail);

      allPointDetailMap.set(pointDetail.pointId, pointDetail);
      /// 现在将它们归入棋盘中
      let cellPointList = groupedPointDetailList.get(minPointId);
      if (!cellPointList) {
        cellPointList = [];
        groupedPointDetailList.set(minPointId, cellPointList);
      }
      cellPointList.push(pointDetail);
    }
    this.allPointDetailList = allPointDetailList;
    this.allPointDetailMap = allPointDetailMap;

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
    const endMinPoint = endPoint.minPoint(gridSize, gridRadix);
    const startMinPoint = startPoint.minPoint(gridSize, gridRadix);
    const minDirectionVector = startMinPoint.toPointVector(endMinPoint);
    for (const minPoint of allMinPointList) {
      const minDistance = Math.sqrt(
        minPoint.calcDistancePow2(startPoint) +
          minPoint.calcDistancePow2(this.endPoint)
      );
      const minVectorA = startMinPoint.toPointVector(minPoint);
      const minAngle = minVectorA.calcAngle(minDirectionVector);
      allMinPointDetailList.push({
        minPoint,
        minPointId: minPoint.toNumber(),
        minAngle,
        minDistance,
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
  // private pointAndDestances = new Map<bigint, number>(); //=new Set<() new Map<number, Set<MatrixPoint>>();
  private allPointDetailList: PointDetail[];
  private allPointDetailMap: ReadonlyMap<bigint, PointDetail>;
  private allMinPointDetailMap: ReadonlyMap<number, MinPointDetail>;
  private todoTasks: ReadonlyMap<MinPointDetail, ReadonlySet<PointDetail>>;
  private resolvedPointIds = new Map<number, Set<bigint>>();
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
          if (
            this.resolvedPointIds
              .get(pointDetail.minPointId)
              ?.has(pointDetail.pointId)
          ) {
            /// 如果已经收到这个格子的广播，那么跳过距离小于等于且方向大于等于这个格子的其它格子
            skipedMinPointDetail = minPointDetail;
            this.onSkipMinPointId.emit(minPointDetail.minPointId);
            break;
          }
          yield pointDetail.point;
          break;
        }
      }
      this._level = 2;
      /// 再做二级遍历
      for (const sortedPointDetails of allTasks.values()) {
        let i = 0;
        for (const pointDetail of sortedPointDetails) {
          if (i === 0) {
            continue;
          }
          if (
            this.resolvedPointIds
              .get(pointDetail.minPointId)
              ?.has(pointDetail.pointId)
          ) {
            continue;
          }
          yield pointDetail.point;
        }
      }
    } while (this.rejectedPointIds.size > 0);
  }
  private _bc: AsyncGenerator<Point>;
  async getNextPoint() {
    const item = await this._bc.next();
    if (item.done) {
      return;
    }
    return item.value;
  }
}
