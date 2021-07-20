export class TokenSet<T> {
  private _set = new Set<T>();
  has(token: T) {
    return this._set.has(token);
  }
  hasEvery(...tokens: T[]) {
    for (const token of tokens) {
      if (!this._set.has(token)) {
        return false;
      }
    }
    return true;
  }
  hasSome(...tokens: T[]) {
    for (const token of tokens) {
      if (this._set.has(token)) {
        return true;
      }
    }
    return false;
  }
  add(...tokens: T[]) {
    const startCount = this._set.size;
    for (const token of tokens) {
      this._set.add(token);
    }
    return this._set.size - startCount;
  }
  remove(...tokens: T[]) {
    const startCount = this._set.size;
    for (const token of tokens) {
      this._set.delete(token);
    }
    return startCount - this._set.size;
  }
  toggle(token: T, force?: boolean) {
    if (force === undefined) {
      force = this ? !this.has(token) : true;
    }
    if (force) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return force;
  }
  clear() {
    this._set.clear();
  }
  get size() {
    return this._set.size;
  }
  [Symbol.iterator]() {
    return this._set[Symbol.iterator]();
  }
  entries() {
    return this._set.entries();
  }
  keys() {
    return this._set.keys();
  }
  values() {
    return this._set.values();
  }
  toSet() {
    return this._set;
  }
}
export class TokenMap<K, T> extends Map<K, TokenSet<T>> {
  add(key: K, ...tokens: T[]) {
    return this._fastAdd(key, this.get(key), tokens);
  }
  private _fastAdd(
    key: K,
    tokenSet: TokenSet<T> | undefined,
    tokens: Iterable<T>
  ) {
    if (!tokenSet) {
      tokenSet = new TokenSet();
      this.set(key, tokenSet);
    }
    return tokenSet.add(...tokens);
  }
  remove(key: K, ...tokens: T[]) {
    return this._fastRemove(key, this.get(key), tokens);
  }
  private _fastRemove(
    key: K,
    tokenSet: TokenSet<T> | undefined,
    tokens: Iterable<T>
  ) {
    if (!tokenSet) {
      return 0;
    }
    const count = tokenSet.remove(...tokens);
    if (tokenSet.size === 0) {
      this.delete(key);
    }
    return count;
  }
  contains(key: K, token: T) {
    const tokenSet = this.get(key);
    if (!tokenSet) {
      return false;
    }
    return tokenSet.has(token);
  }
  toggle(key: K, token: T, force?: boolean) {
    const tokenSet = this.get(key);
    if (force === undefined) {
      force = tokenSet ? !tokenSet.has(token) : true;
    }

    if (force) {
      this._fastAdd(key, tokenSet, [token]);
    } else {
      this._fastRemove(key, tokenSet, [token]);
    }
    return force;
  }
}
