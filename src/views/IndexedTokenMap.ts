import { TokenMap, TokenSet } from "./TokenMap";

export class IndexedTokenMap<K, T> extends TokenMap<K, T> {
  public readonly indexes = new TokenMap<T, K>();
  set(key: K, newValues: TokenSet<T>) {
    /// 解除旧索引
    const oldValues = this.get(key);
    if (oldValues) {
      for (const value of oldValues) {
        this.indexes.remove(value, key);
      }
    }
    /// 构建新索引
    for (const value of newValues) {
      this.indexes.add(value, key);
    }
    super.set(key, newValues);
    return this;
  }
  add(key: K, ...values: T[]) {
    /// 补充新索引
    for (const value of values) {
      this.indexes.add(value, key);
    }
    return super.add(key, ...values);
  }
  remove(key: K, ...values: T[]) {
    /// 补充新索引
    for (const value of values) {
      this.indexes.remove(value, key);
    }
    return super.remove(key, ...values);
  }
  toggle(key: K, token: T, force?: boolean) {
    const res = super.toggle(key, token, force);
    if (res) {
      this.indexes.add(token, key);
    } else {
      this.indexes.remove(token, key);
    }
    return res;
  }
}
