import { Evt } from "./evt";

export class Point implements BM.PointPro {
  constructor(
    public readonly x: number,
    public readonly y: number,
    /* 正方形的边长 */
    public readonly edgeSize: number
  ) {
    this.onData.on((data) => {
      this.ownDatas.add(data);
    });
  }
  readonly onData = new Evt<string>();
  readonly ownDatas = new Set<string>();

  private _bi?: bigint;
  toBigInt() {
    if (this._bi === undefined) {
      this._bi = BigInt(this.y) * BigInt(this.edgeSize) + BigInt(this.x);
    }
    return this._bi;
  }
  private _n?: number;
  toNumber() {
    if (this._n === undefined) {
      this._n = this.y * this.edgeSize + this.x;
    }
    return this._n;
  }
  toReadableString() {
    return `(${this.x + 1},${this.y + 1})`;
  }
  calcDistancePow2(point: BM.Point) {
    return (this.x - point.x) ** 2 + (this.y - point.y) ** 2;
  }
  calcDistance(point: BM.Point) {
    return Math.sqrt(this.calcDistancePow2(point));
  }
  makeVector(toPoint: BM.Point) {
    return new Vector(toPoint.x - this.x, toPoint.y - this.y, this.edgeSize);
  }
  /**
   *
   * @param edgeSize 不包含的最大值，比如64，那就是0~63
   * @returns
   */
  min(edgeSize: number) {
    return {
      x: Math.floor((this.x / this.edgeSize) * edgeSize),
      y: Math.floor((this.y / this.edgeSize) * edgeSize),
    };
  }
  minPoint(minEdgeSize: number) {
    const { x, y } = this.min(minEdgeSize);
    return new Point(x, y, minEdgeSize);
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
