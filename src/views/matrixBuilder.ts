import { Point } from "@/matrix/Point";
import { LinearBroadcastMatrix } from "@/matrix/linear.mb";
import { RandomBroadcastMatrix } from "@/matrix/random.mb";
import { RippleBroadcastMatrix } from "@/matrix/ripple.mb";
import { FibonacciBroadcastMatrix } from "@/matrix/fibonacci.mb";

export enum MATRIX_TYPE {
  Linear = "线性广播",
  Ripple = "涟漪广播",
  Random = "随机广播",
  Fibonacci = "斐波那契广播",
}
export function matrixBuilder(
  startPoint: Point,
  mType: MATRIX_TYPE = MATRIX_TYPE.Ripple
) /* BM.BroadcastMatrix<Point> */ {
  switch (mType) {
    case MATRIX_TYPE.Ripple:
      return new RippleBroadcastMatrix(startPoint);
    case MATRIX_TYPE.Linear:
      return new LinearBroadcastMatrix(startPoint);
    case MATRIX_TYPE.Random:
      return new RandomBroadcastMatrix(startPoint);
    case MATRIX_TYPE.Fibonacci:
      return new FibonacciBroadcastMatrix(startPoint);
  }
}
