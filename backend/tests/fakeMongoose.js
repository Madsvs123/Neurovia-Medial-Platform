/**
 * Minimal in-memory stand-in for the Mongoose models used by the messaging
 * module, so services can be exercised end-to-end (create → claim → reply →
 * resolve …) without a MongoDB binary. Query/aggregation matching is done
 * by `mingo` (a JS implementation of the MongoDB query language).
 *
 * Supported: find/findOne/findById (+ select/sort/limit/populate/lean chain),
 * findOneAndUpdate/findByIdAndUpdate ($set/$addToSet/$push/$pull), create,
 * insertMany, countDocuments, distinct, deleteMany, findByIdAndDelete,
 * aggregate ($match/$group/$sort/$limit …), document.save/deleteOne/
 * populate/toObject/markModified, `new Model(doc)`.
 *
 * ObjectIds are real mongoose ObjectIds; for matching, both filter and
 * documents are normalised to strings so `$in`/`$ne` behave.
 */
const mongoose = require('mongoose');
require('mingo/init/system'); // register all pipeline/query operators
const { Query, Aggregator } = require('mingo');

const { ObjectId } = mongoose.Types;

const isOid = (v) => v instanceof ObjectId || (v && v._bsontype === 'ObjectId');

function normalise(v, seen = new WeakMap()) {
  if (v === null || v === undefined) return v;
  if (isOid(v)) return v.toString();
  if (v instanceof Date) return v;
  if (v instanceof RegExp) return v;
  if (Array.isArray(v)) return v.map((x) => normalise(x, seen));
  if (typeof v === 'object') {
    if (v.toObject && !v.$isFake) return normalise(v.toObject(), seen);
    if (seen.has(v)) return seen.get(v);
    const out = {};
    seen.set(v, out);
    Object.entries(v).forEach(([k, val]) => { out[k] = normalise(val, seen); });
    return out;
  }
  return v;
}

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const setPath = (obj, path, value) => {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { if (o[k] == null) o[k] = {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
};

const registry = new Map(); // modelName -> FakeModel

class FakeDoc {
  constructor(model, data) {
    Object.defineProperty(this, '$model', { value: model, enumerable: false });
    Object.defineProperty(this, '$isFake', { value: true, enumerable: false });
    Object.defineProperty(this, '$populated', { value: {}, enumerable: false, writable: true });
    Object.assign(this, model.applyDefaults(data));
    if (!this._id) this._id = new ObjectId();
    (model.methods || {}) && Object.entries(model.methods).forEach(([name, fn]) => {
      Object.defineProperty(this, name, { value: fn.bind(this), enumerable: false });
    });
  }

  toObject() {
    const out = {};
    Object.keys(this).forEach((k) => { out[k] = this[k]; });
    return clonePlain(out);
  }

  async save() {
    this.updatedAt = new Date();
    if (!this.createdAt) this.createdAt = this.updatedAt;
    this.$model.upsert(this);
    return this;
  }

  async deleteOne() {
    this.$model.docs = this.$model.docs.filter((d) => d._id.toString() !== this._id.toString());
    return { deletedCount: 1 };
  }

  async populate(path, select) {
    this.$model.populateDoc(this, typeof path === 'string' ? [{ path, select }] : path);
    return this;
  }

  markModified() {}
  equals(other) { return this._id.toString() === (other?._id || other)?.toString(); }
}

function clonePlain(v) {
  if (v === null || v === undefined) return v;
  if (isOid(v)) return v;
  if (v instanceof Date) return new Date(v);
  if (Array.isArray(v)) return v.map(clonePlain);
  if (typeof v === 'object') {
    if (v.$isFake) return clonePlain(v.toObject());
    const o = {};
    Object.keys(v).forEach((k) => { o[k] = clonePlain(v[k]); });
    return o;
  }
  return v;
}

class FakeQuery {
  constructor(model, op, filter = {}, extra = {}) {
    this.model = model; this.op = op; this.filter = filter; this.extra = extra;
    this._select = null; this._sort = null; this._limit = null; this._populate = []; this._lean = false;
  }
  select(s) { this._select = s; return this; }
  sort(s) { this._sort = s; return this; }
  limit(n) { this._limit = n; return this; }
  skip() { return this; }
  lean() { this._lean = true; return this; }
  populate(p, select) {
    if (Array.isArray(p)) this._populate.push(...p);
    else if (typeof p === 'string') this._populate.push({ path: p, select });
    else this._populate.push(p);
    return this;
  }
  async distinct(field) {
    const rows = this.model.match(this.filter);
    const seen = new Map();
    rows.forEach((r) => { const v = getPath(r, field); if (v !== undefined) seen.set(v.toString(), v); });
    return Array.from(seen.values());
  }
  exec() {
    let rows = this.model.match(this.filter);
    if (this._sort) {
      const entries = Object.entries(this._sort);
      rows = [...rows].sort((a, b) => {
        for (const [k, dir] of entries) {
          const av = getPath(a, k); const bv = getPath(b, k);
          const as = isOid(av) ? av.toString() : av; const bs = isOid(bv) ? bv.toString() : bv;
          if (as < bs) return -1 * dir; if (as > bs) return 1 * dir;
        }
        return 0;
      });
    }
    if (this._limit) rows = rows.slice(0, this._limit);
    let docs = rows.map((r) => (this._lean ? clonePlain(r) : this.model.wrap(r)));
    if (this._populate.length) docs.forEach((d) => this.model.populateDoc(d, this._populate));
    if (this.op === 'findOne') return Promise.resolve(docs[0] || null);
    return Promise.resolve(docs);
  }
  then(res, rej) { return this.exec().then(res, rej); }
  catch(rej) { return this.exec().catch(rej); }
}

class FakeModel {
  constructor(name, { defaults = {}, methods = {}, refs = {} } = {}) {
    this.modelName = name; this.docs = []; this.defaults = defaults; this.methods = methods; this.refs = refs;
    registry.set(name, this);
  }

  applyDefaults(data) {
    const d = clonePlain(data);
    Object.entries(this.defaults).forEach(([k, v]) => { if (d[k] === undefined) d[k] = typeof v === 'function' ? v() : clonePlain(v); });
    return d;
  }

  // Always hand out a fresh document (like a real query would) so that
  // populate() or mutations on a query result never alter the stored copy.
  wrap(raw) { return new FakeDoc(this, clonePlain(raw instanceof FakeDoc ? raw.toObject() : raw)); }
  upsert(doc) {
    const idx = this.docs.findIndex((d) => d._id.toString() === doc._id.toString());
    if (idx >= 0) this.docs[idx] = doc; else this.docs.push(doc);
  }

  match(filter) {
    const q = new Query(normalise(filter));
    return this.docs.filter((d) => q.test(normalise(d)));
  }

  populateDoc(doc, specs) {
    specs.forEach(({ path, select }) => {
      const refName = this.refs[path];
      if (!refName) return;
      const ref = registry.get(refName);
      if (!ref) return;
      const pick = (id) => {
        if (!id) return id;
        const found = ref.docs.find((d) => d._id.toString() === (id._id || id).toString());
        if (!found) return null;
        const out = {};
        const fields = select ? select.split(' ') : Object.keys(found);
        ['_id', ...fields].forEach((f) => { if (found[f] !== undefined) out[f] = found[f]; });
        return out;
      };
      const [head, tail] = path.includes('.') ? path.split(/\.(.+)/) : [path, null];
      if (tail && Array.isArray(doc[head])) {
        doc[head].forEach((item) => { item[tail] = pick(item[tail]); });
      } else if (tail) {
        if (doc[head]) doc[head][tail] = pick(doc[head][tail]);
      } else if (Array.isArray(doc[head])) {
        doc[head] = doc[head].map(pick).filter(Boolean);
      } else {
        doc[head] = pick(doc[head]);
      }
    });
  }

  // ---- statics ----
  find(filter = {}) { return new FakeQuery(this, 'find', filter); }
  findOne(filter = {}) { return new FakeQuery(this, 'findOne', filter); }
  findById(id) { return new FakeQuery(this, 'findOne', { _id: id }); }
  async countDocuments(filter = {}) { return this.match(filter).length; }
  async create(data) {
    if (Array.isArray(data)) return this.insertMany(data);
    const doc = new FakeDoc(this, data);
    doc.createdAt = doc.createdAt || new Date(); doc.updatedAt = doc.updatedAt || doc.createdAt;
    this.upsert(doc);
    return doc;
  }
  async insertMany(arr) { const out = []; for (const d of arr) out.push(await this.create(d)); return out; }
  async deleteMany(filter = {}) {
    const ids = new Set(this.match(filter).map((d) => d._id.toString()));
    this.docs = this.docs.filter((d) => !ids.has(d._id.toString()));
    return { deletedCount: ids.size };
  }
  async findByIdAndDelete(id) {
    const doc = this.docs.find((d) => d._id.toString() === id.toString());
    if (doc) await doc.deleteOne();
    return doc || null;
  }
  applyUpdate(doc, update) {
    Object.entries(update).forEach(([op, fields]) => {
      if (op === '$set') Object.entries(fields).forEach(([k, v]) => setPath(doc, k, v));
      else if (op === '$addToSet') Object.entries(fields).forEach(([k, v]) => { const arr = getPath(doc, k) || []; if (!arr.some((x) => x.toString() === v.toString())) arr.push(v); setPath(doc, k, arr); });
      else if (op === '$push') Object.entries(fields).forEach(([k, v]) => { const arr = getPath(doc, k) || []; arr.push(v); setPath(doc, k, arr); });
      else if (op === '$pull') Object.entries(fields).forEach(([k, v]) => { setPath(doc, k, (getPath(doc, k) || []).filter((x) => x.toString() !== v.toString())); });
      else setPath(doc, op, fields); // plain field
    });
    doc.updatedAt = new Date();
  }
  findOneAndUpdate(filter, update, opts = {}) {
    const [raw] = this.match(filter);
    if (!raw) return { populate: () => Promise.resolve(null), then: (r) => r(null) };
    const doc = this.wrap(raw);
    this.applyUpdate(doc, update);
    this.upsert(doc);
    const q = new FakeQuery(this, 'findOne', { _id: doc._id });
    return opts.new === false ? Promise.resolve(doc) : q;
  }
  findByIdAndUpdate(id, update, opts) { return this.findOneAndUpdate({ _id: id }, update, opts); }
  async aggregate(pipeline) {
    const agg = new Aggregator(normalise(pipeline));
    return agg.run(this.docs.map((d) => normalise(d)));
  }
  async getSingleton() {
    let [doc] = this.docs;
    if (!doc) doc = await this.create({ key: 'default' });
    return doc;
  }
  reset() { this.docs = []; }
}

/** Construct `new Model(data)` support via a callable proxy. */
function makeModel(name, opts) {
  const model = new FakeModel(name, opts);
  const ctor = function Ctor(data) { return new FakeDoc(model, data); };
  return new Proxy(ctor, {
    get(target, prop) {
      if (prop in model) { const v = model[prop]; return typeof v === 'function' ? v.bind(model) : v; }
      return target[prop];
    },
    set(target, prop, value) { model[prop] = value; return true; },
    construct(target, args) { return new FakeDoc(model, args[0]); },
  });
}

module.exports = { makeModel, FakeDoc, registry, ObjectId };
