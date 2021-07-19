type Fun<T> = (data: T) => unknown;
export class Evt<T> {
  emit(data: T) {
    for (const cb of this._cbs) {
      cb(data);
    }
  }
  private _cbs = new Set<Fun<T>>();
  on(cb: Fun<T>) {
    this._cbs.add(cb);
  }
  off(cb: Fun<T>) {
    return this._cbs.delete(cb);
  }
}
