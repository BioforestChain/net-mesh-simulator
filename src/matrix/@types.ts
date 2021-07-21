declare namespace BM {
  type PromiseMaybe<T> = Promise<T> | T;
  interface Point {
    x: number;
    y: number;
  }
  /**节点坐标 */
  interface PointPro extends Point {
    edgeSize: number;
    toNumber(): number;
    toBigInt(): bigint;
    calcDistance(point: Point): number;
    toReadableString(): string;
    onData: import("./evt").Evt<string>;
  }
  /**广播矩阵 */
  interface BroadcastMatrix<P extends PointPro> {
    readonly currentPoint: P;
    /**添加一个节点 */
    addConntectedPoint(point: Point): PromiseMaybe<boolean>;
    /**开始矩阵广播 */
    startMartixBroadcast(
      startPoint: Point,
      endPoint: Point,
      data: string
    ): PromiseMaybe<MatrixBroadcast<P>>;
  }
  /**矩阵广播 */
  interface MatrixBroadcast<P extends PointPro> {
    readonly startPoint: P;
    readonly currentPoint: P;
    readonly endPoint: P;
    readonly data: string;
    /**某一个节点完成了同步 */
    resolvePoint(point: Point): PromiseMaybe<boolean>;
    /**某一个节点同步失败 */
    rejectPoint(point: Point): PromiseMaybe<boolean>;
    /**获取下一个需要进行同步的节点 */
    getNextPoint(): PromiseMaybe<P | undefined>;
  }
}
