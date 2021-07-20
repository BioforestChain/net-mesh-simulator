declare namespace BM {
  type PromiseMaybe<T> = Promise<T> | T;
  /**节点坐标 */
  interface Point {
    x: number;
    y: number;
  }
  /**广播矩阵 */
  interface BroadcastMatrix {
    /**添加一个节点 */
    addConntectedPoint(point: Point): PromiseMaybe<boolean>;
    /**开始矩阵广播 */
    startMartixBroadcast(
      target: Point,
      data: string
    ): PromiseMaybe<MartixBroadcast>;
  }
  /**矩阵广播 */
  interface MartixBroadcast {
    /**某一个节点完成了同步 */
    resolvePoint(point: Point): PromiseMaybe<boolean>;
    /**某一个节点同步失败 */
    rejectPoint(point: Point): PromiseMaybe<boolean>;
    /**获取下一个需要进行同步的节点 */
    getNextPoint(): PromiseMaybe<Point | undefined>;
  }
}
