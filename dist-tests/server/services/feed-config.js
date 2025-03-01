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
exports.FeedConfigService = void 0;
var logger_1 = require("../logger");
var FeedConfigService = /** @class */ (function () {
    function FeedConfigService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
    }
    FeedConfigService.prototype.getFeedConfig = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM feed_configs WHERE id = $1', [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error('Error getting feed config:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FeedConfigService.prototype.getFeedConfigs = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM feed_configs WHERE user_id = $1', [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error('Error getting feed configs:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FeedConfigService.prototype.createFeedConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query("INSERT INTO feed_configs (\n          user_id,\n          feed_url,\n          is_active,\n          last_fetch_at,\n          fetch_interval_minutes\n        ) VALUES ($1, $2, $3, $4, $5) RETURNING *", [
                                config.userId,
                                config.feedUrl,
                                config.isActive,
                                config.lastFetchAt || null,
                                config.fetchIntervalMinutes || null
                            ])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error('Error creating feed config:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FeedConfigService.prototype.updateFeedConfig = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var setClauses, values, paramIndex, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        setClauses = [];
                        values = [id];
                        paramIndex = 2;
                        if ('userId' in updates && updates.userId !== undefined) {
                            setClauses.push("user_id = $".concat(paramIndex++));
                            values.push(updates.userId);
                        }
                        if ('feedUrl' in updates && updates.feedUrl !== undefined) {
                            setClauses.push("feed_url = $".concat(paramIndex++));
                            values.push(updates.feedUrl);
                        }
                        if ('isActive' in updates && updates.isActive !== undefined) {
                            setClauses.push("is_active = $".concat(paramIndex++));
                            values.push(updates.isActive);
                        }
                        if ('lastFetchAt' in updates) {
                            setClauses.push("last_fetch_at = $".concat(paramIndex++));
                            values.push(updates.lastFetchAt || null);
                        }
                        if ('fetchIntervalMinutes' in updates) {
                            setClauses.push("fetch_interval_minutes = $".concat(paramIndex++));
                            values.push(updates.fetchIntervalMinutes || null);
                        }
                        if (setClauses.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.pool.query("UPDATE feed_configs SET ".concat(setClauses.join(', '), " WHERE id = $1 RETURNING *"), values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_4 = _a.sent();
                        logger_1.logger.error('Error updating feed config:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FeedConfigService.prototype.deleteFeedConfig = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('DELETE FROM feed_configs WHERE id = $1 RETURNING id', [id])];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0];
                    case 2:
                        error_5 = _b.sent();
                        logger_1.logger.error('Error deleting feed config:', error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return FeedConfigService;
}());
exports.FeedConfigService = FeedConfigService;
