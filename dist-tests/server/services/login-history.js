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
exports.LoginHistoryService = void 0;
var logger_1 = require("../utils/logger");
var LoginHistoryService = /** @class */ (function () {
    function LoginHistoryService(pool) {
        this.pool = pool;
    }
    /**
     * Record a login attempt
     */
    LoginHistoryService.prototype.recordLogin = function (userId_1, ipAddress_1, userAgent_1) {
        return __awaiter(this, arguments, void 0, function (userId, ipAddress, userAgent, success, failureReason) {
            var error_1;
            if (success === void 0) { success = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query("INSERT INTO login_history (\n          user_id,\n          login_time,\n          ip_address,\n          user_agent,\n          success,\n          failure_reason,\n          request_path,\n          created_at,\n          updated_at\n        ) VALUES ($1, NOW(), $2, $3, $4, $5, NULL, NOW(), NOW())", [userId, ipAddress, userAgent, success, failureReason])];
                    case 1:
                        _a.sent();
                        logger_1.logger.info('Login recorded successfully', {
                            userId: userId,
                            ipAddress: ipAddress,
                            success: success
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error('Failed to record login', {
                            userId: userId,
                            ipAddress: ipAddress,
                            error: error_1
                        });
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Record a failed login attempt without a user ID
     */
    LoginHistoryService.prototype.recordFailedAttempt = function (ipAddress, userAgent, failureReason, requestPath, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query("INSERT INTO login_history (\n          user_id,\n          login_time, \n          ip_address, \n          user_agent, \n          success, \n          failure_reason,\n          request_path\n        )\n        VALUES ($1, NOW(), $2, $3, false, $4, $5)", [userId || null, ipAddress, userAgent, failureReason, requestPath])];
                    case 1:
                        _a.sent();
                        logger_1.logger.info({ ipAddress: ipAddress, failureReason: failureReason }, 'Failed login attempt recorded');
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error({ error: error_2, ipAddress: ipAddress }, 'Failed to record failed login attempt');
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get login history for a user or IP address
     */
    LoginHistoryService.prototype.getLoginHistory = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query("SELECT * FROM login_history \n       WHERE user_id = $1 \n       ORDER BY login_time DESC", [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Get the last login for a user
     */
    LoginHistoryService.prototype.getLastLogin = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query("SELECT * FROM login_history \n         WHERE user_id = $1 \n         ORDER BY login_time DESC \n         LIMIT 1", [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error({ error: error_3, userId: userId }, 'Failed to get last login');
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return LoginHistoryService;
}());
exports.LoginHistoryService = LoginHistoryService;
