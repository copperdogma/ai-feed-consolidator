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
exports.UserService = void 0;
var logger_1 = require("../logger");
var UserService = /** @class */ (function () {
    function UserService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
        this.transactionManager = serviceContainer.getService('transactionManager');
    }
    /**
     * Find a user by their ID
     */
    UserService.prototype.findById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM users WHERE id = $1', [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error({ err: error_1 }, 'Error finding user by ID');
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find a user by their email address
     */
    UserService.prototype.findByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM users WHERE email = $1', [email])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error({ error: error_2, email: email }, 'Error finding user by email');
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update a user's information
     */
    UserService.prototype.updateUser = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var setClauses_1, values_1, paramIndex_1, allowedFields_1, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        setClauses_1 = [];
                        values_1 = [];
                        paramIndex_1 = 1;
                        allowedFields_1 = ['display_name', 'email', 'avatar_url'];
                        Object.entries(updates).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (value !== undefined && allowedFields_1.includes(key)) {
                                setClauses_1.push("".concat(key, " = $").concat(paramIndex_1));
                                values_1.push(value);
                                paramIndex_1++;
                            }
                        });
                        if (setClauses_1.length === 0) {
                            return [2 /*return*/, null];
                        }
                        values_1.push(id);
                        return [4 /*yield*/, this.pool.query("UPDATE users \n         SET ".concat(setClauses_1.join(', '), ", updated_at = NOW()\n         WHERE id = $").concat(paramIndex_1, "\n         RETURNING *"), values_1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error({ error: error_3, userId: id, updates: updates }, 'Error updating user');
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a user and all their associated data
     */
    UserService.prototype.deleteUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        // Delete in order to respect foreign key constraints
                        return [4 /*yield*/, this.pool.query('DELETE FROM user_preferences WHERE user_id = $1', [id])];
                    case 1:
                        // Delete in order to respect foreign key constraints
                        _b.sent();
                        return [4 /*yield*/, this.pool.query('DELETE FROM item_states WHERE user_id = $1', [id])];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.pool.query('DELETE FROM feed_configs WHERE user_id = $1', [id])];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, this.pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id])];
                    case 4:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0];
                    case 5:
                        error_4 = _b.sent();
                        logger_1.logger.error({ error: error_4, userId: id }, 'Error deleting user');
                        throw error_4;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate a user exists and has required fields
     */
    UserService.prototype.validateUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, user, errors, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM users WHERE id = $1', [id])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            return [2 /*return*/, {
                                    valid: false,
                                    errors: ['User not found']
                                }];
                        }
                        user = result.rows[0];
                        errors = [];
                        if (!user.email) {
                            errors.push('Email is required');
                        }
                        if (!user.display_name) {
                            errors.push('Display name is required');
                        }
                        return [2 /*return*/, {
                                valid: errors.length === 0,
                                errors: errors
                            }];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error({ error: error_5, userId: id }, 'Error validating user');
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    UserService.prototype.getUserProfile = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var userResult, user, preferencesResult, preferences, defaultPreferences, newPrefsResult;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT * FROM users WHERE id = $1', [userId])];
                                        case 1:
                                            userResult = _a.sent();
                                            if (userResult.rows.length === 0) {
                                                return [2 /*return*/, null];
                                            }
                                            user = userResult.rows[0];
                                            return [4 /*yield*/, client.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])];
                                        case 2:
                                            preferencesResult = _a.sent();
                                            preferences = preferencesResult.rows;
                                            if (!(preferences.length === 0)) return [3 /*break*/, 4];
                                            defaultPreferences = {
                                                theme: 'light',
                                                email_notifications: true,
                                                content_language: 'en',
                                                summary_level: 1
                                            };
                                            return [4 /*yield*/, client.query("INSERT INTO user_preferences (\n              user_id, \n              theme, \n              email_notifications, \n              content_language, \n              summary_level,\n              created_at,\n              updated_at\n            )\n            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n            RETURNING *", [
                                                    userId,
                                                    defaultPreferences.theme,
                                                    defaultPreferences.email_notifications,
                                                    defaultPreferences.content_language,
                                                    defaultPreferences.summary_level
                                                ])];
                                        case 3:
                                            newPrefsResult = _a.sent();
                                            preferences = [newPrefsResult.rows[0]];
                                            _a.label = 4;
                                        case 4: return [2 /*return*/, { user: user, preferences: preferences }];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_6 = _a.sent();
                        logger_1.logger.error({ error: error_6, userId: userId }, 'Error getting user profile');
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return UserService;
}());
exports.UserService = UserService;
