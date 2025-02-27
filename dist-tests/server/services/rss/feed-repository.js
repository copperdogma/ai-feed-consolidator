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
exports.FeedRepository = void 0;
var logger_1 = require("../../logger");
var FeedRepository = /** @class */ (function () {
    function FeedRepository(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
        this.transactionManager = serviceContainer.getService('transactionManager');
    }
    /**
     * Add a new RSS feed for a user
     */
    FeedRepository.prototype.addFeed = function (userId, feedUrl, feedInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var userResult, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT id FROM users WHERE id = $1', [userId])];
                                        case 1:
                                            userResult = _a.sent();
                                            if (userResult.rows.length === 0) {
                                                throw new Error('User not found');
                                            }
                                            return [4 /*yield*/, client.query("INSERT INTO feed_configs (\n            user_id, feed_url, title, description, site_url, \n            error_count, error_category\n          )\n          VALUES ($1, $2, $3, $4, $5, 0, NULL)\n          RETURNING *", [
                                                    userId,
                                                    feedUrl,
                                                    (feedInfo === null || feedInfo === void 0 ? void 0 : feedInfo.title) || null,
                                                    (feedInfo === null || feedInfo === void 0 ? void 0 : feedInfo.description) || null,
                                                    (feedInfo === null || feedInfo === void 0 ? void 0 : feedInfo.link) || null
                                                ])];
                                        case 2:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error({ error: error_1, userId: userId, feedUrl: feedUrl }, 'Error adding feed');
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get a feed by its ID without requiring user ID
     */
    FeedRepository.prototype.getFeedById = function (feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var feeds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fetchFeeds('WHERE id = $1', [feedId])];
                    case 1:
                        feeds = _a.sent();
                        return [2 /*return*/, feeds[0] || null];
                }
            });
        });
    };
    /**
     * Get a specific feed for a user
     */
    FeedRepository.prototype.getFeed = function (userId, feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var feeds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fetchFeeds('WHERE user_id = $1 AND id = $2', [userId, feedId])];
                    case 1:
                        feeds = _a.sent();
                        return [2 /*return*/, feeds[0] || null];
                }
            });
        });
    };
    /**
     * Get all active feeds for a user
     */
    FeedRepository.prototype.getUserFeeds = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.fetchFeeds('WHERE user_id = $1 ORDER BY created_at DESC', [userId])];
            });
        });
    };
    /**
     * Get feeds that are due for update
     */
    FeedRepository.prototype.getFeedsDueForUpdate = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.fetchFeeds("WHERE is_active = true\n       AND (\n         last_fetched_at IS NULL\n         OR last_fetched_at < NOW() - (COALESCE(fetch_interval_minutes, 60) || ' minutes')::interval\n       )\n       AND (\n         NOT EXISTS (\n           SELECT 1 FROM feed_health\n           WHERE feed_health.feed_config_id = feed_configs.id\n           AND feed_health.is_permanently_invalid = true\n         )\n       )")];
            });
        });
    };
    /**
     * Update feed health status
     */
    FeedRepository.prototype.updateFeedHealth = function (feedId, update) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var feedResult, feedUrl, requiresSpecialHandling, specialHandlerType, query, result;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT feed_url FROM feed_configs WHERE id = $1', [feedId])];
                                        case 1:
                                            feedResult = _b.sent();
                                            feedUrl = (_a = feedResult.rows[0]) === null || _a === void 0 ? void 0 : _a.feed_url;
                                            requiresSpecialHandling = (feedUrl === null || feedUrl === void 0 ? void 0 : feedUrl.includes('kijiji.ca')) || false;
                                            specialHandlerType = requiresSpecialHandling ? 'KIJIJI' : null;
                                            query = "\n          WITH upsert AS (\n            UPDATE feed_health\n            SET last_check_at = NOW(),\n                consecutive_failures = CASE\n                  WHEN $2::text IS NOT NULL THEN COALESCE(consecutive_failures, 0) + 1\n                  ELSE 0\n                END,\n                last_error_category = $3,\n                last_error_detail = $2,\n                is_permanently_invalid = $4,\n                requires_special_handling = $5,\n                special_handler_type = $6\n            WHERE feed_config_id = $1\n            RETURNING *\n          ),\n          insert_if_not_exists AS (\n            INSERT INTO feed_health (\n              feed_config_id,\n              last_check_at,\n              consecutive_failures,\n              last_error_category,\n              last_error_detail,\n              is_permanently_invalid,\n              requires_special_handling,\n              special_handler_type\n            )\n            SELECT\n              $1,\n              NOW(),\n              CASE WHEN $2::text IS NOT NULL THEN 1 ELSE 0 END,\n              $3,\n              $2,\n              $4,\n              $5,\n              $6\n            WHERE NOT EXISTS (SELECT 1 FROM upsert)\n            RETURNING *\n          )\n          SELECT * FROM upsert\n          UNION ALL\n          SELECT * FROM insert_if_not_exists";
                                            return [4 /*yield*/, client.query(query, [
                                                    feedId,
                                                    update.lastError,
                                                    update.errorCategory,
                                                    update.isPermanentlyInvalid,
                                                    requiresSpecialHandling,
                                                    specialHandlerType
                                                ])];
                                        case 2:
                                            result = _b.sent();
                                            return [2 /*return*/, result.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error('Error updating feed health', {
                            feedId: feedId,
                            update: update,
                            error: error_2
                        });
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update feed metadata after successful fetch
     */
    FeedRepository.prototype.updateFeedMetadata = function (feedId, feedInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query("UPDATE feed_configs \n           SET title = $1,\n               description = $2,\n               site_url = $3,\n               last_fetched_at = CURRENT_TIMESTAMP,\n               error_count = 0,\n               updated_at = NOW()\n           WHERE id = $4", [feedInfo.title || '', feedInfo.description || '', feedInfo.link || '', feedId])];
                                        case 1:
                                            _a.sent();
                                            // Reset feed health on successful update
                                            return [4 /*yield*/, client.query("\n          UPDATE feed_health\n          SET consecutive_failures = 0,\n              last_error_category = NULL,\n              last_error_detail = NULL,\n              last_check_at = NOW()\n          WHERE feed_config_id = $1\n        ", [feedId])];
                                        case 2:
                                            // Reset feed health on successful update
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error('Error updating feed metadata', {
                            feedId: feedId,
                            error: error_3
                        });
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save feed items to the database
     */
    FeedRepository.prototype.saveFeedItems = function (feedConfigId, items) {
        return __awaiter(this, void 0, void 0, function () {
            var insertedItems, error_4;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!items || items.length === 0) {
                            return [2 /*return*/, []];
                        }
                        insertedItems = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var _i, items_1, item, result;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _i = 0, items_1 = items;
                                            _b.label = 1;
                                        case 1:
                                            if (!(_i < items_1.length)) return [3 /*break*/, 4];
                                            item = items_1[_i];
                                            logger_1.logger.debug({ feedConfigId: feedConfigId, itemTitle: item.title, itemGuid: item.guid }, 'Inserting feed item');
                                            return [4 /*yield*/, client.query("INSERT INTO feed_items (\n              feed_config_id, guid, title, link, description, \n              content, author, categories, pub_date, \n              created_at, updated_at\n            ) \n            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())\n            ON CONFLICT (feed_config_id, guid) \n            DO UPDATE SET\n              title = EXCLUDED.title,\n              link = EXCLUDED.link,\n              description = EXCLUDED.description,\n              content = EXCLUDED.content,\n              author = EXCLUDED.author,\n              categories = EXCLUDED.categories,\n              pub_date = EXCLUDED.pub_date,\n              updated_at = NOW()\n            RETURNING *", [
                                                    feedConfigId,
                                                    item.guid,
                                                    item.title,
                                                    item.link,
                                                    item.description,
                                                    item.content,
                                                    item.author,
                                                    item.categories,
                                                    item.pub_date
                                                ])];
                                        case 2:
                                            result = _b.sent();
                                            if (result.rows[0]) {
                                                insertedItems.push(result.rows[0]);
                                                logger_1.logger.debug({ feedConfigId: feedConfigId, itemTitle: result.rows[0].title }, 'Item inserted successfully');
                                            }
                                            else {
                                                logger_1.logger.warn({ feedConfigId: feedConfigId, itemTitle: item.title }, 'Item insert did not return a row');
                                            }
                                            _b.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4:
                                            logger_1.logger.info({
                                                feedConfigId: feedConfigId,
                                                itemCount: insertedItems.length,
                                                firstSavedTitle: (_a = insertedItems[0]) === null || _a === void 0 ? void 0 : _a.title
                                            }, 'Items saved to database');
                                            return [2 /*return*/, insertedItems];
                                    }
                                });
                            }); }, {
                                // Set higher timeouts for batch operations
                                statementTimeout: 30000, // 30 seconds
                                lockTimeout: 10000 // 10 seconds
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, insertedItems];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error({ error: error_4, feedConfigId: feedConfigId }, 'Error saving feed items');
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Helper method to fetch feeds with a WHERE clause
     */
    FeedRepository.prototype.fetchFeeds = function (whereClause_1) {
        return __awaiter(this, arguments, void 0, function (whereClause, params) {
            var result, error_5;
            var _this = this;
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withReadTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query("SELECT * FROM feed_configs ".concat(whereClause), params)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error({ error: error_5, whereClause: whereClause, params: params }, 'Error fetching feeds');
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update feed configuration
     */
    FeedRepository.prototype.updateFeedConfig = function (feedId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var updateFields, values, paramIndex;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            updateFields = [];
                                            values = [];
                                            paramIndex = 1;
                                            if (updates.isActive !== undefined) {
                                                updateFields.push("is_active = $".concat(paramIndex));
                                                values.push(updates.isActive);
                                                paramIndex++;
                                            }
                                            if (updates.fetchIntervalMinutes !== undefined) {
                                                updateFields.push("fetch_interval_minutes = $".concat(paramIndex));
                                                values.push(updates.fetchIntervalMinutes);
                                                paramIndex++;
                                            }
                                            if (updateFields.length === 0) {
                                                return [2 /*return*/];
                                            }
                                            values.push(feedId);
                                            return [4 /*yield*/, client.query("UPDATE feed_configs \n           SET ".concat(updateFields.join(', '), ", updated_at = NOW()\n           WHERE id = $").concat(paramIndex), values)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        logger_1.logger.error({ error: error_6, feedId: feedId, updates: updates }, 'Error updating feed config');
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset the last fetched timestamp to force an immediate update
     */
    FeedRepository.prototype.resetLastFetchedAt = function (feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transactionManager.withWriteTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('UPDATE feed_configs SET last_fetched_at = NULL WHERE id = $1', [feedId])];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        logger_1.logger.error({ error: error_7, feedId: feedId }, 'Error resetting last fetched timestamp');
                        throw error_7;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return FeedRepository;
}());
exports.FeedRepository = FeedRepository;
