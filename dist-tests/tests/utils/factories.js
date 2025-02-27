"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.TestDataFactory = void 0;
var crypto_1 = require("crypto");
var logger_1 = require("../../server/logger");
var TestDataFactory = /** @class */ (function () {
    function TestDataFactory() {
        this.pool = null;
        this.isInitialized = false;
        this.userIdSequence = 1;
        this.feedConfigSequence = 1;
    }
    TestDataFactory.getInstance = function () {
        if (!TestDataFactory.instance) {
            TestDataFactory.instance = new TestDataFactory();
        }
        return TestDataFactory.instance;
    };
    TestDataFactory.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.isInitialized) {
                    return [2 /*return*/];
                }
                if (!this.pool) {
                    throw new Error('Pool must be set before initialization');
                }
                this.isInitialized = true;
                logger_1.logger.info('TestDataFactory initialized successfully');
                return [2 /*return*/];
            });
        });
    };
    TestDataFactory.prototype.setPool = function (pool) {
        this.pool = pool;
    };
    TestDataFactory.prototype.resetSequences = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, _i, _a, row;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.pool || !this.isInitialized) {
                            throw new Error('TestDataFactory not initialized');
                        }
                        return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 8, 9]);
                        return [4 /*yield*/, client.query("\n        SELECT sequence_name \n        FROM information_schema.sequences \n        WHERE sequence_schema = 'public'\n      ")];
                    case 3:
                        result = _b.sent();
                        _i = 0, _a = result.rows;
                        _b.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        row = _a[_i];
                        return [4 /*yield*/, client.query("ALTER SEQUENCE \"".concat(row.sequence_name, "\" RESTART WITH 1"))];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7:
                        this.userIdSequence = 1;
                        this.feedConfigSequence = 1;
                        return [3 /*break*/, 9];
                    case 8:
                        client.release();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    TestDataFactory.prototype.getPool = function () {
        if (!this.pool) {
            throw new Error('TestDataFactory not initialized. Call initialize() first.');
        }
        return this.pool;
    };
    TestDataFactory.prototype.withTransaction = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, error_1, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPool().connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, 14, 16]);
                        // Set a longer statement timeout for test data creation
                        return [4 /*yield*/, client.query('SET statement_timeout = 30000')];
                    case 3:
                        // Set a longer statement timeout for test data creation
                        _a.sent(); // 30 seconds
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, callback(client)];
                    case 5:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 7:
                        error_1 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 8:
                        _a.sent();
                        if (!(error_1.code === '40P01')) return [3 /*break*/, 13];
                        // Retry the transaction once with a small delay
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 9:
                        // Retry the transaction once with a small delay
                        _a.sent();
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, callback(client)];
                    case 11:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 12:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 13: throw error_1;
                    case 14: 
                    // Reset statement timeout to default
                    return [4 /*yield*/, client.query('SET statement_timeout = 5000').catch(function () { })];
                    case 15:
                        // Reset statement timeout to default
                        _a.sent(); // Ignore errors
                        client.release();
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    TestDataFactory.prototype.createUser = function () {
        return __awaiter(this, arguments, void 0, function (overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                if (!this.pool || !this.isInitialized) {
                    throw new Error('TestDataFactory not initialized');
                }
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var uniqueId, email, googleId, userResult, user;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    uniqueId = Math.random().toString(36).substring(2, 15);
                                    email = overrides.email || "test-".concat(uniqueId, "@example.com");
                                    googleId = overrides.google_id || "google-".concat(uniqueId);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO users (\n          email,\n          google_id,\n          display_name,\n          avatar_url,\n          created_at,\n          updated_at\n        ) VALUES ($1, $2, $3, $4, NOW(), NOW())\n        RETURNING *\n      ", [email, googleId, overrides.display_name || null, overrides.avatar_url || null])];
                                case 1:
                                    userResult = _a.sent();
                                    user = userResult.rows[0];
                                    // Create user preferences in the same transaction
                                    return [4 /*yield*/, client.query("\n        INSERT INTO user_preferences (\n          user_id,\n          theme,\n          email_notifications,\n          content_language,\n          summary_level,\n          created_at,\n          updated_at\n        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n      ", [user.id, 'light', true, 'en', 1])];
                                case 2:
                                    // Create user preferences in the same transaction
                                    _a.sent();
                                    return [2 /*return*/, user];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createFullUserProfile = function () {
        return __awaiter(this, arguments, void 0, function (overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var defaults, data, userResult, user, prefsResult;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    defaults = {
                                        google_id: "test-google-".concat(Date.now()),
                                        email: "test-".concat(Date.now(), "@example.com"),
                                        display_name: "Test User ".concat(Date.now()),
                                        avatar_url: null,
                                        theme: 'light',
                                        email_notifications: true,
                                        content_language: 'en',
                                        summary_level: 1
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO users (\n          google_id,\n          email,\n          display_name,\n          avatar_url,\n          created_at,\n          updated_at\n        ) VALUES ($1, $2, $3, $4, NOW(), NOW())\n        RETURNING *\n      ", [data.google_id, data.email, data.display_name, data.avatar_url])];
                                case 1:
                                    userResult = _a.sent();
                                    user = userResult.rows[0];
                                    return [4 /*yield*/, client.query("\n        INSERT INTO user_preferences (\n          user_id,\n          theme,\n          email_notifications,\n          content_language,\n          summary_level,\n          created_at,\n          updated_at\n        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n        RETURNING *\n      ", [
                                            user.id,
                                            data.theme,
                                            data.email_notifications,
                                            data.content_language,
                                            data.summary_level
                                        ])];
                                case 2:
                                    prefsResult = _a.sent();
                                    return [2 /*return*/, {
                                            user: user,
                                            preferences: [prefsResult.rows[0]]
                                        }];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createFeedConfig = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userResult, id, data, result, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                                case 1:
                                    userResult = _a.sent();
                                    if (userResult.rows.length === 0) {
                                        throw new Error("User with ID ".concat(userId, " does not exist"));
                                    }
                                    if (!(overrides && overrides.id !== undefined)) return [3 /*break*/, 3];
                                    id = overrides.id;
                                    data = __assign({ feed_url: 'http://example.com/feed.xml', title: 'Test Feed', description: 'Test Description', site_url: 'http://example.com', icon_url: 'http://example.com/icon.png', last_fetched_at: new Date(), error_count: 0, is_active: true, fetch_interval_minutes: 60 }, overrides);
                                    return [4 /*yield*/, client.query("\n          INSERT INTO feed_configs (\n            id,\n            user_id,\n            feed_url,\n            title,\n            description,\n            site_url,\n            icon_url,\n            last_fetched_at,\n            error_count,\n            is_active,\n            fetch_interval_minutes,\n            created_at,\n            updated_at\n          ) OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())\n          RETURNING *\n        ", [
                                            id,
                                            userId,
                                            data.feed_url,
                                            data.title,
                                            data.description,
                                            data.site_url,
                                            data.icon_url,
                                            data.last_fetched_at,
                                            data.error_count,
                                            data.is_active,
                                            data.fetch_interval_minutes
                                        ])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                                case 3:
                                    data = __assign({ feed_url: 'http://example.com/feed.xml', title: 'Test Feed', description: 'Test Description', site_url: 'http://example.com', icon_url: 'http://example.com/icon.png', last_fetched_at: new Date(), error_count: 0, is_active: true, fetch_interval_minutes: 60 }, overrides);
                                    return [4 /*yield*/, client.query("\n          INSERT INTO feed_configs (\n            user_id,\n            feed_url,\n            title,\n            description,\n            site_url,\n            icon_url,\n            last_fetched_at,\n            error_count,\n            is_active,\n            fetch_interval_minutes,\n            created_at,\n            updated_at\n          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())\n          RETURNING *\n        ", [
                                            userId,
                                            data.feed_url,
                                            data.title,
                                            data.description,
                                            data.site_url,
                                            data.icon_url,
                                            data.last_fetched_at,
                                            data.error_count,
                                            data.is_active,
                                            data.fetch_interval_minutes
                                        ])];
                                case 4:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createFeedHealth = function (feedConfigId_1) {
        return __awaiter(this, arguments, void 0, function (feedConfigId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var feedConfig, isKijijiFeed, defaults, data, existingHealth, result, result, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT feed_url FROM feed_configs WHERE id = $1 FOR UPDATE', [feedConfigId])];
                                case 1:
                                    feedConfig = _a.sent();
                                    if (!feedConfig.rows[0]) {
                                        throw new Error("Feed config with id ".concat(feedConfigId, " does not exist"));
                                    }
                                    isKijijiFeed = feedConfig.rows[0].feed_url.includes('kijiji.ca');
                                    defaults = {
                                        last_check_at: new Date(),
                                        last_error_at: null,
                                        last_error_category: null,
                                        last_error_detail: null,
                                        consecutive_failures: 0,
                                        is_permanently_invalid: false,
                                        requires_special_handling: isKijijiFeed,
                                        special_handler_type: isKijijiFeed ? 'KIJIJI' : null,
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query('SELECT * FROM feed_health WHERE feed_config_id = $1 FOR UPDATE', [feedConfigId])];
                                case 2:
                                    existingHealth = _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 8, , 9]);
                                    if (!existingHealth.rows[0]) return [3 /*break*/, 5];
                                    return [4 /*yield*/, client.query("\n            UPDATE feed_health\n            SET last_check_at = $2,\n                last_error_at = $3,\n                last_error_category = $4,\n                last_error_detail = $5,\n                consecutive_failures = $6,\n                is_permanently_invalid = $7,\n                requires_special_handling = $8,\n                special_handler_type = $9,\n                updated_at = NOW()\n            WHERE feed_config_id = $1\n            RETURNING *\n          ", [
                                            feedConfigId,
                                            data.last_check_at,
                                            data.last_error_at,
                                            data.last_error_category,
                                            data.last_error_detail,
                                            data.consecutive_failures,
                                            data.is_permanently_invalid,
                                            data.requires_special_handling,
                                            data.special_handler_type
                                        ])];
                                case 4:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                                case 5: return [4 /*yield*/, client.query("\n            INSERT INTO feed_health (\n              feed_config_id,\n              last_check_at,\n              last_error_at,\n              last_error_category,\n              last_error_detail,\n              consecutive_failures,\n              is_permanently_invalid,\n              requires_special_handling,\n              special_handler_type,\n              created_at,\n              updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())\n            RETURNING *\n          ", [
                                        feedConfigId,
                                        data.last_check_at,
                                        data.last_error_at,
                                        data.last_error_category,
                                        data.last_error_detail,
                                        data.consecutive_failures,
                                        data.is_permanently_invalid,
                                        data.requires_special_handling,
                                        data.special_handler_type
                                    ])];
                                case 6:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                                case 7: return [3 /*break*/, 9];
                                case 8:
                                    error_2 = _a.sent();
                                    if (error_2.code === '23503') { // Foreign key violation
                                        throw new Error("Feed config with id ".concat(feedConfigId, " was deleted during health record creation"));
                                    }
                                    throw error_2;
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createUserWithFeed = function () {
        return __awaiter(this, arguments, void 0, function (overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userDefaults, userData, userResult, user, feedDefaults, feedData, feedResult, feed, isKijijiFeed, healthDefaults, healthData, healthResult, health;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    userDefaults = {
                                        google_id: "test-google-id-".concat(Date.now()),
                                        email: "test-".concat(Date.now(), "@example.com"),
                                        display_name: 'Test User',
                                        avatar_url: 'https://example.com/avatar.jpg'
                                    };
                                    userData = __assign(__assign({}, userDefaults), overrides.user);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO users (\n          google_id,\n          email,\n          display_name,\n          avatar_url,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, NOW(), NOW())\n        RETURNING *\n      ", [userData.google_id, userData.email, userData.display_name, userData.avatar_url])];
                                case 1:
                                    userResult = _a.sent();
                                    user = userResult.rows[0];
                                    // Create preferences
                                    return [4 /*yield*/, client.query("\n        INSERT INTO user_preferences (\n          user_id,\n          theme,\n          email_notifications,\n          content_language,\n          summary_level,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n      ", [user.id, 'light', true, 'en', 1])];
                                case 2:
                                    // Create preferences
                                    _a.sent();
                                    feedDefaults = {
                                        feed_url: 'http://example.com/feed.xml',
                                        title: 'Test Feed',
                                        description: 'Test Description',
                                        site_url: 'http://example.com',
                                        icon_url: 'http://example.com/icon.png',
                                        error_count: 0,
                                        is_active: true,
                                        fetch_interval_minutes: 60
                                    };
                                    feedData = __assign(__assign({}, feedDefaults), overrides.feed);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO feed_configs (\n          user_id,\n          feed_url,\n          title,\n          description,\n          site_url,\n          icon_url,\n          last_fetched_at,\n          error_count,\n          is_active,\n          fetch_interval_minutes,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, NOW(), NOW())\n        RETURNING *\n      ", [
                                            user.id,
                                            feedData.feed_url,
                                            feedData.title,
                                            feedData.description,
                                            feedData.site_url,
                                            feedData.icon_url,
                                            feedData.error_count,
                                            feedData.is_active,
                                            feedData.fetch_interval_minutes
                                        ])];
                                case 3:
                                    feedResult = _a.sent();
                                    feed = feedResult.rows[0];
                                    isKijijiFeed = feedData.feed_url.includes('kijiji.ca');
                                    healthDefaults = {
                                        last_check_at: new Date(),
                                        last_error_at: null,
                                        last_error_category: null,
                                        last_error_detail: null,
                                        consecutive_failures: 0,
                                        is_permanently_invalid: false,
                                        requires_special_handling: isKijijiFeed,
                                        special_handler_type: isKijijiFeed ? 'KIJIJI' : null
                                    };
                                    healthData = __assign(__assign({}, healthDefaults), overrides.health);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO feed_health (\n          feed_config_id,\n          last_check_at,\n          last_error_at,\n          last_error_category,\n          last_error_detail,\n          consecutive_failures,\n          is_permanently_invalid,\n          requires_special_handling,\n          special_handler_type,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())\n        RETURNING *\n      ", [
                                            feed.id,
                                            healthData.last_check_at,
                                            healthData.last_error_at,
                                            healthData.last_error_category,
                                            healthData.last_error_detail,
                                            healthData.consecutive_failures,
                                            healthData.is_permanently_invalid,
                                            healthData.requires_special_handling,
                                            healthData.special_handler_type
                                        ])];
                                case 4:
                                    healthResult = _a.sent();
                                    health = healthResult.rows[0];
                                    return [2 /*return*/, { user: user, feed: feed, health: health }];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createAuthTestData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var user, preferences, error_3, pool, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createUser()];
                    case 1:
                        user = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 7]);
                        return [4 /*yield*/, this.createUserPreferences(user.id)];
                    case 3:
                        preferences = _a.sent();
                        return [2 /*return*/, { user: user, preferences: preferences }];
                    case 4:
                        error_3 = _a.sent();
                        if (!(error_3.code === '23505')) return [3 /*break*/, 6];
                        pool = this.getPool();
                        return [4 /*yield*/, pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [user.id])];
                    case 5:
                        result = _a.sent();
                        return [2 /*return*/, { user: user, preferences: result.rows[0] }];
                    case 6: throw error_3;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    TestDataFactory.prototype.createUserPreferences = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var client, userResult, existingPrefs, defaults, data, result, result;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pool || !this.isInitialized) {
                            throw new Error('TestDataFactory not initialized');
                        }
                        return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 9, 10]);
                        return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                    case 3:
                        userResult = _a.sent();
                        if (userResult.rows.length === 0) {
                            throw new Error("User with ID ".concat(userId, " does not exist"));
                        }
                        return [4 /*yield*/, client.query('SELECT * FROM user_preferences WHERE user_id = $1 FOR UPDATE', [userId])];
                    case 4:
                        existingPrefs = _a.sent();
                        defaults = existingPrefs.rows.length > 0 ? {
                            theme: existingPrefs.rows[0].theme,
                            email_notifications: existingPrefs.rows[0].email_notifications,
                            content_language: existingPrefs.rows[0].content_language,
                            summary_level: existingPrefs.rows[0].summary_level
                        } : {
                            theme: 'light',
                            email_notifications: true,
                            content_language: 'en',
                            summary_level: 1
                        };
                        data = __assign(__assign({}, defaults), overrides);
                        if (!(existingPrefs.rows.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, client.query("UPDATE user_preferences\n           SET theme = $1,\n               email_notifications = $2,\n               content_language = $3,\n               summary_level = $4,\n               updated_at = NOW()\n           WHERE user_id = $5\n           RETURNING *", [data.theme, data.email_notifications, data.content_language, data.summary_level, userId])];
                    case 5:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 6: return [4 /*yield*/, client.query("INSERT INTO user_preferences (\n            user_id,\n            theme,\n            email_notifications,\n            content_language,\n            summary_level,\n            created_at,\n            updated_at\n          )\n          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n          RETURNING *", [userId, data.theme, data.email_notifications, data.content_language, data.summary_level])];
                    case 7:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        client.release();
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    TestDataFactory.prototype.createFeedItem = function (feedConfigId_1) {
        return __awaiter(this, arguments, void 0, function (feedConfigId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var feedConfigResult, defaults, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM feed_configs WHERE id = $1 FOR UPDATE', [feedConfigId])];
                                case 1:
                                    feedConfigResult = _a.sent();
                                    if (feedConfigResult.rows.length === 0) {
                                        throw new Error("Feed config with ID ".concat(feedConfigId, " does not exist"));
                                    }
                                    defaults = {
                                        source_type: 'RSS',
                                        source_id: 'test-source-id',
                                        title: 'Test Item',
                                        author: 'Test Author',
                                        content: 'Test Content',
                                        summary: 'Test Summary',
                                        url: 'http://example.com/item',
                                        guid: 'test-guid',
                                        published_at: new Date(),
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO feed_items (\n          feed_config_id,\n          source_type,\n          source_id,\n          title,\n          author,\n          content,\n          summary,\n          url,\n          guid,\n          published_at,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())\n        RETURNING *\n      ", [
                                            feedConfigId,
                                            data.source_type,
                                            data.source_id,
                                            data.title,
                                            data.author,
                                            data.content,
                                            data.summary,
                                            data.url,
                                            data.guid,
                                            data.published_at,
                                        ])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createItemState = function (userId_1, feedItemId_1) {
        return __awaiter(this, arguments, void 0, function (userId, feedItemId, isRead, isSaved) {
            var _this = this;
            if (isRead === void 0) { isRead = false; }
            if (isSaved === void 0) { isSaved = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userResult, itemResult, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                                case 1:
                                    userResult = _a.sent();
                                    if (userResult.rows.length === 0) {
                                        throw new Error("User with ID ".concat(userId, " does not exist"));
                                    }
                                    return [4 /*yield*/, client.query('SELECT id FROM feed_items WHERE id = $1 FOR UPDATE', [feedItemId])];
                                case 2:
                                    itemResult = _a.sent();
                                    if (itemResult.rows.length === 0) {
                                        throw new Error("Feed item with ID ".concat(feedItemId, " does not exist"));
                                    }
                                    return [4 /*yield*/, client.query("\n        INSERT INTO item_states (\n          user_id,\n          feed_item_id,\n          is_read,\n          is_saved,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, NOW(), NOW())\n        RETURNING *\n      ", [userId, feedItemId, isRead, isSaved])];
                                case 3:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.getFeedHealth = function (feedConfigId) {
        return __awaiter(this, void 0, void 0, function () {
            var pool, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pool = this.getPool();
                        return [4 /*yield*/, pool.query('SELECT * FROM feed_health WHERE feed_config_id = $1', [feedConfigId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    TestDataFactory.prototype.createLoginHistory = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userResult, defaults, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                                case 1:
                                    userResult = _a.sent();
                                    if (userResult.rows.length === 0) {
                                        throw new Error("User with ID ".concat(userId, " does not exist"));
                                    }
                                    defaults = {
                                        ip_address: '127.0.0.1',
                                        user_agent: 'Test Browser',
                                        success: true,
                                        failure_reason: null,
                                        request_path: '/api/auth/login'
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO login_history (\n          user_id,\n          ip_address,\n          user_agent,\n          success,\n          failure_reason,\n          request_path,\n          login_time,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())\n        RETURNING *\n      ", [userId, data.ip_address, data.user_agent, data.success, data.failure_reason, data.request_path])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createSession = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userResult, defaults, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                                case 1:
                                    userResult = _a.sent();
                                    if (userResult.rows.length === 0) {
                                        throw new Error("User with ID ".concat(userId, " does not exist"));
                                    }
                                    defaults = {
                                        session_token: "test-session-".concat(crypto_1.default.randomUUID()),
                                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                                        ip_address: '127.0.0.1',
                                        user_agent: 'Test Browser'
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO sessions (\n          user_id,\n          session_token,\n          expires_at,\n          ip_address,\n          user_agent,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n        RETURNING *\n      ", [userId, data.session_token, data.expires_at, data.ip_address, data.user_agent])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createProcessedItem = function (feedItemId_1) {
        return __awaiter(this, arguments, void 0, function (feedItemId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var feedItemResult, defaults, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM feed_items WHERE id = $1 FOR UPDATE', [feedItemId])];
                                case 1:
                                    feedItemResult = _a.sent();
                                    if (feedItemResult.rows.length === 0) {
                                        throw new Error("Feed item with ID ".concat(feedItemId, " does not exist"));
                                    }
                                    defaults = {
                                        processed_summary: 'Test processed summary',
                                        content_type: 'article',
                                        time_sensitive: false,
                                        required_background: [],
                                        consumption_time_minutes: 5,
                                        consumption_type: 'read',
                                        processed_at: new Date(),
                                        version: 1
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO processed_items (\n          feed_item_id,\n          processed_summary,\n          content_type,\n          time_sensitive,\n          required_background,\n          consumption_time_minutes,\n          consumption_type,\n          processed_at,\n          version,\n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())\n        RETURNING *\n      ", [
                                            feedItemId,
                                            data.processed_summary,
                                            data.content_type,
                                            data.time_sensitive,
                                            data.required_background,
                                            data.consumption_time_minutes,
                                            data.consumption_type,
                                            data.processed_at,
                                            data.version
                                        ])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createSyncHistory = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var userResult, defaults, data, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])];
                                case 1:
                                    userResult = _a.sent();
                                    if (userResult.rows.length === 0) {
                                        throw new Error("User with ID ".concat(userId, " does not exist"));
                                    }
                                    defaults = {
                                        started_at: new Date(),
                                        completed_at: null,
                                        success: null,
                                        error_message: null,
                                        items_processed: 0
                                    };
                                    data = __assign(__assign({}, defaults), overrides);
                                    return [4 /*yield*/, client.query("\n        INSERT INTO sync_history (\n          user_id,\n          started_at,\n          completed_at,\n          success,\n          error_message,\n          items_processed\n        ) VALUES ($1, $2, $3, $4, $5, $6)\n        RETURNING *\n      ", [
                                            userId,
                                            data.started_at,
                                            data.completed_at,
                                            data.success,
                                            data.error_message,
                                            data.items_processed
                                        ])];
                                case 2:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows[0]];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createFeedWithHealth = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var _this = this;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var feedConfig, health;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.createFeedConfig(userId, overrides.feedConfig)];
                                case 1:
                                    feedConfig = _a.sent();
                                    return [4 /*yield*/, this.createFeedHealth(feedConfig.id, overrides.health)];
                                case 2:
                                    health = _a.sent();
                                    return [2 /*return*/, { feedConfig: feedConfig, health: health }];
                            }
                        });
                    }); })];
            });
        });
    };
    TestDataFactory.prototype.createKijijiFeedWithHealth = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, overrides) {
            var feedConfigOverrides, healthOverrides;
            var _a;
            if (overrides === void 0) { overrides = {}; }
            return __generator(this, function (_b) {
                feedConfigOverrides = __assign(__assign({}, overrides.feedConfig), { feed_url: ((_a = overrides.feedConfig) === null || _a === void 0 ? void 0 : _a.feed_url) || 'https://www.kijiji.ca/rss/cars/calgary/c27l1700199' });
                healthOverrides = __assign(__assign({}, overrides.health), { requires_special_handling: true, special_handler_type: 'KIJIJI' });
                return [2 /*return*/, this.createFeedWithHealth(userId, {
                        feedConfig: feedConfigOverrides,
                        health: healthOverrides
                    })];
            });
        });
    };
    TestDataFactory.instance = null;
    return TestDataFactory;
}());
exports.TestDataFactory = TestDataFactory;
