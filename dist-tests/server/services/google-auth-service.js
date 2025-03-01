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
exports.GoogleAuthService = void 0;
var logger_1 = require("../logger");
var GoogleAuthService = /** @class */ (function () {
    function GoogleAuthService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
        this.userService = serviceContainer.getService('userService');
    }
    GoogleAuthService.initialize = function (serviceContainer) {
        if (!GoogleAuthService.instance) {
            GoogleAuthService.instance = new GoogleAuthService(serviceContainer);
        }
    };
    GoogleAuthService.getInstance = function (serviceContainer) {
        if (!GoogleAuthService.instance) {
            throw new Error('GoogleAuthService not initialized');
        }
        return GoogleAuthService.instance;
    };
    GoogleAuthService.prototype.findOrCreateGoogleUser = function (profile) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, email, result, error_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id])];
                    case 1:
                        existingUser = _e.sent();
                        if (existingUser.rows[0]) {
                            return [2 /*return*/, existingUser.rows[0]];
                        }
                        email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                        if (!email) {
                            throw new Error('Email is required for Google authentication');
                        }
                        return [4 /*yield*/, this.pool.query("INSERT INTO users (\n          google_id, email, display_name, avatar_url, created_at, updated_at\n        ) VALUES ($1, $2, $3, $4, NOW(), NOW())\n        RETURNING *", [
                                profile.id,
                                email,
                                profile.displayName || email.split('@')[0],
                                ((_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || null
                            ])];
                    case 2:
                        result = _e.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 3:
                        error_1 = _e.sent();
                        logger_1.logger.error({ err: error_1, profileId: profile.id }, 'Error in findOrCreateGoogleUser');
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update a user's Google profile information
     */
    GoogleAuthService.prototype.updateGoogleProfile = function (userId, profile) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, result, error_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        updates = {
                            display_name: profile.displayName,
                            avatar_url: ((_b = (_a = profile.photos) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || null,
                            email: (_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value
                        };
                        return [4 /*yield*/, this.pool.query("UPDATE users \n         SET display_name = $1,\n             avatar_url = $2,\n             email = $3,\n             updated_at = NOW()\n         WHERE id = $4\n         RETURNING *", [updates.display_name, updates.avatar_url, updates.email, userId])];
                    case 1:
                        result = _e.sent();
                        if (result.rows.length === 0) {
                            throw new Error("User not found: ".concat(userId));
                        }
                        return [2 /*return*/, result.rows[0]];
                    case 2:
                        error_2 = _e.sent();
                        logger_1.logger.error({ error: error_2, userId: userId }, 'Error updating Google profile');
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Link a Google account to an existing user
     */
    GoogleAuthService.prototype.linkGoogleAccount = function (userId, profile) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.pool.query('SELECT id FROM users WHERE google_id = $1 AND id != $2', [profile.id, userId])];
                    case 1:
                        existing = _a.sent();
                        if (existing.rows.length > 0) {
                            throw new Error('Google account already linked to another user');
                        }
                        return [4 /*yield*/, this.pool.query("UPDATE users \n         SET google_id = $1,\n             updated_at = NOW()\n         WHERE id = $2\n         RETURNING id", [profile.id, userId])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.length > 0];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error({ error: error_3, userId: userId, profileId: profile.id }, 'Error linking Google account');
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Unlink a Google account from a user
     */
    GoogleAuthService.prototype.unlinkGoogleAccount = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.userService.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error("User not found: ".concat(userId));
                        }
                        // For now, we don't allow unlinking if it's the only auth method
                        // In the future, we might want to check for other auth methods (email/password, etc.)
                        if (!user.google_id) {
                            throw new Error('Google account not linked');
                        }
                        return [4 /*yield*/, this.pool.query("UPDATE users \n         SET google_id = NULL,\n             updated_at = NOW()\n         WHERE id = $1\n         RETURNING id", [userId])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.length > 0];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error({ error: error_4, userId: userId }, 'Error unlinking Google account');
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoogleAuthService.instance = null;
    return GoogleAuthService;
}());
exports.GoogleAuthService = GoogleAuthService;
