import { Point } from "@/matrix/Point";
import { LinearBroadcastMatrix } from "@/matrix/linear.mb";
import { RandomBroadcastMatrix } from "@/matrix/random.mb";
import { RippleBroadcastMatrix } from "@/matrix/ripple.mb";

export enum MATRIX_TYPE {
  Linear = "线性广播",
  Ripple = "涟漪广播",
  Random = "随机广播",
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
  }
}
