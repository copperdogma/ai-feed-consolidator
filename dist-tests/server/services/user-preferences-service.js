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
exports.UserPreferencesService = void 0;
exports.initializeUserPreferencesService = initializeUserPreferencesService;
exports.getUserPreferencesService = getUserPreferencesService;
var pino_1 = require("pino");
var logger = (0, pino_1.default)({ name: 'UserPreferencesService' });
var UserPreferencesService = /** @class */ (function () {
    function UserPreferencesService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
        this.transactionManager = serviceContainer.getService('transactionManager');
    }
    /**
     * Get user preferences, creating default ones if they don't exist
     */
    UserPreferencesService.prototype.getPreferences = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var result, defaultPreferences, newPrefsResult;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])];
                                        case 1:
                                            result = _a.sent();
                                            if (result.rows.length > 0) {
                                                return [2 /*return*/, result.rows[0]];
                                            }
                                            defaultPreferences = {
                                                theme: 'light',
                                                email_notifications: true,
                                                content_language: 'en',
                                                summary_level: 1
                                            };
                                            return [4 /*yield*/, client.query("INSERT INTO user_preferences (\n            user_id, \n            theme, \n            email_notifications, \n            content_language, \n            summary_level,\n            created_at,\n            updated_at\n          )\n          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n          RETURNING *", [
                                                    userId,
                                                    defaultPreferences.theme,
                                                    defaultPreferences.email_notifications,
                                                    defaultPreferences.content_language,
                                                    defaultPreferences.summary_level
                                                ])];
                                        case 2:
                                            newPrefsResult = _a.sent();
                                            return [2 /*return*/, newPrefsResult.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        logger.error({ error: error_1, userId: userId }, 'Error getting user preferences');
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update user preferences
     */
    UserPreferencesService.prototype.updatePreferences = function (userId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var current, updateFields, values, paramIndex, allowedFields, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.getPreferences(userId)];
                                        case 1:
                                            current = _a.sent();
                                            updateFields = [];
                                            values = [];
                                            paramIndex = 1;
                                            allowedFields = ['theme', 'email_notifications', 'content_language', 'summary_level'];
                                            Object.entries(updates).forEach(function (_a) {
                                                var key = _a[0], value = _a[1];
                                                if (value !== undefined && allowedFields.includes(key)) {
                                                    updateFields.push("".concat(key, " = $").concat(paramIndex));
                                                    values.push(value);
                                                    paramIndex++;
                                                }
                                            });
                                            if (updateFields.length === 0) {
                                                return [2 /*return*/, current];
                                            }
                                            values.push(userId);
                                            return [4 /*yield*/, client.query("UPDATE user_preferences \n           SET ".concat(updateFields.join(', '), ", updated_at = NOW()\n           WHERE user_id = $").concat(paramIndex, "\n           RETURNING *"), values)];
                                        case 2:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        logger.error({ error: error_2, userId: userId, updates: updates }, 'Error updating user preferences');
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create default preferences for a user
     */
    UserPreferencesService.prototype.createDefaultPreferences = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var existing, defaultPreferences, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])];
                                        case 1:
                                            existing = _a.sent();
                                            if (existing.rows.length > 0) {
                                                return [2 /*return*/, existing.rows[0]];
                                            }
                                            defaultPreferences = {
                                                theme: 'light',
                                                email_notifications: true,
                                                content_language: 'en',
                                                summary_level: 1
                                            };
                                            return [4 /*yield*/, client.query("INSERT INTO user_preferences (\n            user_id, \n            theme, \n            email_notifications, \n            content_language, \n            summary_level,\n            created_at,\n            updated_at\n          )\n          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n          RETURNING *", [
                                                    userId,
                                                    defaultPreferences.theme,
                                                    defaultPreferences.email_notifications,
                                                    defaultPreferences.content_language,
                                                    defaultPreferences.summary_level
                                                ])];
                                        case 2:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_3 = _a.sent();
                        logger.error({ error: error_3, userId: userId }, 'Error creating default preferences');
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate user preferences
     */
    UserPreferencesService.prototype.validatePreferences = function (preferences) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, languageRegex;
            return __generator(this, function (_a) {
                errors = [];
                // Theme validation
                if (preferences.theme !== undefined && !['light', 'dark'].includes(preferences.theme)) {
                    errors.push('Theme must be either "light" or "dark"');
                }
                // Email notifications validation
                if (preferences.email_notifications !== undefined && typeof preferences.email_notifications !== 'boolean') {
                    errors.push('Email notifications must be a boolean');
                }
                // Content language validation
                if (preferences.content_language !== undefined) {
                    languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
                    if (!languageRegex.test(preferences.content_language)) {
                        errors.push('Content language must be a valid language code (e.g., "en" or "en-US")');
                    }
                }
                // Summary level validation
                if (preferences.summary_level !== undefined) {
                    if (!Number.isInteger(preferences.summary_level) || preferences.summary_level < 1 || preferences.summary_level > 3) {
                        errors.push('Summary level must be an integer between 1 and 3');
                    }
                }
                return [2 /*return*/, {
                        valid: errors.length === 0,
                        errors: errors
                    }];
            });
        });
    };
    return UserPreferencesService;
}());
exports.UserPreferencesService = UserPreferencesService;
var preferencesServiceInstance = null;
function initializeUserPreferencesService(container) {
    preferencesServiceInstance = new UserPreferencesService(container);
}
function getUserPreferencesService(container) {
    if (!preferencesServiceInstance) {
        if (!container) {
            throw new Error('UserPreferencesService not initialized');
        }
        if (typeof container.getPool !== 'function') {
            // If container does not have getPool, assume it's a Pool and wrap it
            var initializeServiceContainer = require('./service-container').initializeServiceContainer;
            container = initializeServiceContainer(container);
        }
        preferencesServiceInstance = new UserPreferencesService(container);
    }
    return preferencesServiceInstance;
}
