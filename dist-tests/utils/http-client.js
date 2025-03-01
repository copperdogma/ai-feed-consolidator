"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
var node_fetch_1 = require("node-fetch");
var abort_controller_1 = require("abort-controller");
var HttpClient = /** @class */ (function () {
    function HttpClient(defaultUserAgent, fallbackUserAgent, timeout) {
        if (timeout === void 0) { timeout = 10000; }
        this.defaultUserAgent = defaultUserAgent;
        this.fallbackUserAgent = fallbackUserAgent;
        this.timeout = timeout;
    }
    HttpClient.prototype.makeRequest = function (url, userAgent) {
        return __awaiter(this, void 0, void 0, function () {
            var controller, timeoutId, options, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        controller = new abort_controller_1.default();
                        timeoutId = setTimeout(function () { return controller.abort(); }, this.timeout);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        options = {
                            headers: { 'User-Agent': userAgent },
                            signal: controller.signal
                        };
                        return [4 /*yield*/, (0, node_fetch_1.default)(url, options)];
                    case 2:
                        response = _a.sent();
                        clearTimeout(timeoutId);
                        return [2 /*return*/, response];
                    case 3:
                        error_1 = _a.sent();
                        clearTimeout(timeoutId);
                        throw this.enhanceError(error_1, url);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    HttpClient.prototype.get = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var response, fallbackResponse, error_2, fallbackResponse, fallbackError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 9]);
                        return [4 /*yield*/, this.makeRequest(url, this.defaultUserAgent)];
                    case 1:
                        response = _a.sent();
                        if (!(response.status === 403)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.makeRequest(url, this.fallbackUserAgent)];
                    case 2:
                        fallbackResponse = _a.sent();
                        fallbackResponse.usedFallback = true;
                        return [2 /*return*/, fallbackResponse];
                    case 3:
                        response.usedFallback = false;
                        return [2 /*return*/, response];
                    case 4:
                        error_2 = _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.makeRequest(url, this.fallbackUserAgent)];
                    case 6:
                        fallbackResponse = _a.sent();
                        fallbackResponse.usedFallback = true;
                        return [2 /*return*/, fallbackResponse];
                    case 7:
                        fallbackError_1 = _a.sent();
                        throw this.enhanceError(fallbackError_1, url);
                    case 8: return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    HttpClient.prototype.enhanceError = function (error, url) {
        var _a, _b, _c, _d, _e, _f;
        var enhancedError = new Error(error.message);
        enhancedError.name = error.name;
        enhancedError.stack = error.stack;
        enhancedError.code = error.code || ((_a = error.cause) === null || _a === void 0 ? void 0 : _a.code);
        enhancedError.cause = error.cause;
        enhancedError.response = error.response;
        // If error or its cause has a category, preserve it
        if (error.errorCategory || ((_b = error.cause) === null || _b === void 0 ? void 0 : _b.errorCategory)) {
            enhancedError.errorCategory = error.errorCategory || ((_c = error.cause) === null || _c === void 0 ? void 0 : _c.errorCategory);
            return enhancedError;
        }
        // Handle timeout errors
        if (error.name === 'AbortError' ||
            error.code === 'ETIMEDOUT' ||
            ((_d = error.message) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('timeout'))) {
            enhancedError.code = 'ETIMEDOUT';
            enhancedError.errorCategory = 'TIMEOUT';
            return enhancedError;
        }
        // Handle SSL errors
        if (error.code === 'CERT_HAS_EXPIRED' ||
            ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('unable to verify')) ||
            error.errno === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            enhancedError.code = 'SSL_ERROR';
            enhancedError.errorCategory = 'SSL_ERROR';
            return enhancedError;
        }
        // Handle DNS errors
        if (error.code === 'ENOTFOUND' ||
            ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('ENOTFOUND'))) {
            enhancedError.code = 'DNS_ERROR';
            enhancedError.errorCategory = 'DNS_ERROR';
            return enhancedError;
        }
        // Default to HTTP_STATUS for other errors
        enhancedError.errorCategory = 'HTTP_STATUS';
        return enhancedError;
    };
    return HttpClient;
}());
exports.HttpClient = HttpClient;
