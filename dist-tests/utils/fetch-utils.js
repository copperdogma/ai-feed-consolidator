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
exports.fetchWithUserAgent = fetchWithUserAgent;
var node_fetch_1 = require("node-fetch");
var DEFAULT_TIMEOUT = 30000; // 30 seconds
function fetchWithUserAgent(url_1, userAgent_1) {
    return __awaiter(this, arguments, void 0, function (url, userAgent, timeout) {
        var controller, timeoutId, options, response, error, errorName, errorCode;
        if (timeout === void 0) { timeout = DEFAULT_TIMEOUT; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    controller = new AbortController();
                    timeoutId = setTimeout(function () { return controller.abort(); }, timeout);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    options = {
                        headers: {
                            'User-Agent': userAgent
                        },
                        signal: controller.signal // Type assertion needed due to incompatible AbortSignal types
                    };
                    return [4 /*yield*/, (0, node_fetch_1.default)(url, options)];
                case 2:
                    response = _a.sent();
                    // Handle status 0 responses as errors
                    if (response.status === 0) {
                        error = new Error(response.statusText || 'Network error');
                        errorName = response.headers.get('x-error-name');
                        errorCode = response.headers.get('x-error-code');
                        error.response = {
                            status: 0,
                            statusText: response.statusText,
                            headers: response.headers,
                            ok: false,
                            errorName: errorName,
                            errorCode: errorCode
                        };
                        throw error;
                    }
                    return [2 /*return*/, response];
                case 3:
                    clearTimeout(timeoutId);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
