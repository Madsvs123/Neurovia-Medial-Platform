/**
 * Small helpers for unit-testing Express controllers without a real
 * MongoDB connection: a chainable "mongoose query" stand-in and a fake
 * res/req pair compatible with express-async-handler.
 */

/** A thenable that also supports the common Mongoose query chain methods. */
function mockQuery(result) {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    select: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return chain;
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((payload) => { res.body = payload; return res; });
  return res;
}

function mockReq(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

const next = (err) => { if (err) throw err; };

module.exports = { mockQuery, mockRes, mockReq, next };
