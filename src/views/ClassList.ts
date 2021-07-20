import { Evt } from "@/matrix/evt";
import { IndexedTokenMap } from "./IndexedTokenMap";
import { TokenSet } from "./TokenMap";

export class ClassList<S> {
  constructor(private source: S, private indexes: IndexedTokenMap<S, string>) {}
  private _tokenSet = new TokenSet<string>();
  readonly onClassChanged = new Evt<{
    mode: "add" | "remove" | "change";
    list: string[];
  }>();
  add(className: string) {
    const count = this._tokenSet.add(className);
    if (count) {
      this.onClassChanged.emit({ mode: "add", list: [className] });
      this.indexes.add(this.source, className);
    }
    return count;
  }
  remove(className: string) {
    const count = this._tokenSet.remove(className);
    if (count) {
      this.onClassChanged.emit({ mode: "remove", list: [className] });
      this.indexes.remove(this.source, className);
    }
    return count;
  }
  toggle(className: string, force?: boolean) {
    const oldSize = this._tokenSet.size;
    const res = this._tokenSet.toggle(className, force);
    if (this._tokenSet.size !== oldSize) {
      this.onClassChanged.emit({
        mode: res ? "add" : "remove",
        list: [className],
      });
      this.indexes.toggle(this.source, className, force);
    }
    return res;
  }
  contains(className: string) {
    return this._tokenSet.has(className);
  }
  containsSome(...classNameList: string[]) {
    return this._tokenSet.hasSome(...classNameList);
  }
  containsEvery(...classNameList: string[]) {
    return this._tokenSet.hasEvery(...classNameList);
  }
  [Symbol.iterator]() {
    return this._tokenSet[Symbol.iterator]();
  }
}
