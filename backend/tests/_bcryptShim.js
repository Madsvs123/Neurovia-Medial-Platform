// Map bcrypt → bcryptjs when the native bcrypt binary is unavailable (test envs only).
const Module = require('module');
const orig = Module._resolveFilename;
let nativeOk = false;
try { require('bcrypt'); nativeOk = true; } catch { nativeOk = false; }
if (!nativeOk) {
  Module._resolveFilename = function (request, ...rest) {
    return orig.call(this, request === 'bcrypt' ? 'bcryptjs' : request, ...rest);
  };
}
