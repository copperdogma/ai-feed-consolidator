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
exports.FeedItemService = void 0;
var FeedItemService = /** @class */ (function () {
    function FeedItemService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
    }
    /**
     * Get a feed item by its source ID and type
     */
    FeedItemService.prototype.getBySourceId = function (sourceType, sourceId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query("SELECT f.*, p.processed_summary, p.content_type, p.time_sensitive, \n              p.required_background, p.consumption_time_minutes, p.consumption_type,\n              f.id::text as db_id\n       FROM feed_items f\n       LEFT JOIN processed_items p ON p.feed_item_id = f.id\n       WHERE f.source_type = $1 AND f.source_id = $2", [sourceType, sourceId])];
                    case 1:
                        result = _a.sent();
                        if (!result.rows[0])
                            return [2 /*return*/, null];
                        item = result.rows[0];
                        item.id = item.db_id;
                        delete item.db_id;
                        return [2 /*return*/, item];
                }
            });
        });
    };
    /**
     * Create or update a feed item
     */
    FeedItemService.prototype.upsertFeedItem = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var client, feedResult, feedItemId, error_1;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _d.sent();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 8, 10, 11]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, client.query("INSERT INTO feed_items (\n          source_id, source_type, title, author, content, summary, url,\n          published_at, crawled_at, engagement_score, raw_metadata, feed_config_id,\n          source_url, image_url\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)\n        ON CONFLICT (source_type, source_id) DO UPDATE SET\n          title = EXCLUDED.title,\n          author = EXCLUDED.author,\n          content = EXCLUDED.content,\n          summary = EXCLUDED.summary,\n          url = EXCLUDED.url,\n          published_at = EXCLUDED.published_at,\n          crawled_at = EXCLUDED.crawled_at,\n          engagement_score = EXCLUDED.engagement_score,\n          raw_metadata = EXCLUDED.raw_metadata,\n          feed_config_id = EXCLUDED.feed_config_id,\n          source_url = EXCLUDED.source_url,\n          image_url = EXCLUDED.image_url,\n          updated_at = CURRENT_TIMESTAMP\n        RETURNING id::text", [
                                item.sourceId,
                                item.source.platform,
                                item.title,
                                item.author,
                                item.content,
                                item.summary,
                                item.url,
                                item.publishedAt,
                                new Date(),
                                ((_a = item.engagement) === null || _a === void 0 ? void 0 : _a.score) || 0,
                                JSON.stringify(item.metadata),
                                item.feedConfigId,
                                item.sourceUrl,
                                item.imageUrl
                            ])];
                    case 4:
                        feedResult = _d.sent();
                        feedItemId = feedResult.rows[0].id;
                        if (!item.processedSummary) return [3 /*break*/, 6];
                        return [4 /*yield*/, client.query("INSERT INTO processed_items (\n            feed_item_id, processed_summary, content_type, time_sensitive,\n            required_background, consumption_time_minutes, consumption_type\n          ) VALUES ($1, $2, $3, $4, $5, $6, $7)\n          ON CONFLICT (feed_item_id, version) DO UPDATE SET\n            processed_summary = EXCLUDED.processed_summary,\n            content_type = EXCLUDED.content_type,\n            time_sensitive = EXCLUDED.time_sensitive,\n            required_background = EXCLUDED.required_background,\n            consumption_time_minutes = EXCLUDED.consumption_time_minutes,\n            consumption_type = EXCLUDED.consumption_type", [
                                feedItemId,
                                item.processedSummary,
                                item.contentType,
                                item.timeSensitive,
                                item.requiredBackground,
                                (_b = item.consumptionTime) === null || _b === void 0 ? void 0 : _b.minutes,
                                (_c = item.consumptionTime) === null || _c === void 0 ? void 0 : _c.type
                            ])];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6: return [4 /*yield*/, client.query('COMMIT')];
                    case 7:
                        _d.sent();
                        return [2 /*return*/, feedItemId];
                    case 8:
                        error_1 = _d.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 9:
                        _d.sent();
                        throw error_1;
                    case 10:
                        client.release();
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get item state for a user
     */
    FeedItemService.prototype.getItemState = function (userId, feedItemId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query('SELECT is_read, is_saved FROM item_states WHERE user_id = $1 AND feed_item_id = $2::integer', [userId, feedItemId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Update item state for a user
     */
    FeedItemService.prototype.updateItemState = function (userId, feedItemId, state) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, values, paramIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updates = [];
                        values = [userId, feedItemId];
                        paramIndex = 3;
                        if (state.isRead !== undefined) {
                            updates.push("is_read = $".concat(paramIndex));
                            values.push(state.isRead);
                            paramIndex++;
                        }
                        if (state.isSaved !== undefined) {
                            updates.push("is_saved = $".concat(paramIndex));
                            values.push(state.isSaved);
                            paramIndex++;
                        }
                        if (updates.length === 0)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.pool.query("INSERT INTO item_states (user_id, feed_item_id, ".concat(state.isRead !== undefined ? 'is_read, ' : '').concat(state.isSaved !== undefined ? 'is_saved, ' : '', "last_synced_at)\n       VALUES ($1, $2::integer, ").concat(state.isRead !== undefined ? "$3, " : '').concat(state.isSaved !== undefined ? "$".concat(paramIndex - 1, ", ") : '', "CURRENT_TIMESTAMP)\n       ON CONFLICT (user_id, feed_item_id) DO UPDATE SET\n         ").concat(updates.join(', '), ",\n         last_synced_at = CURRENT_TIMESTAMP,\n         updated_at = CURRENT_TIMESTAMP"), values)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all saved items for a user
     */
    FeedItemService.prototype.getSavedItems = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            var result;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query("SELECT f.*, f.id::text as db_id, \n              p.processed_summary, p.content_type, p.time_sensitive,\n              p.required_background, p.consumption_time_minutes, p.consumption_type,\n              s.is_read, s.is_saved\n       FROM feed_items f\n       INNER JOIN item_states s ON s.feed_item_id = f.id\n       LEFT JOIN processed_items p ON p.feed_item_id = f.id\n       WHERE s.user_id = $1 AND s.is_saved = true\n       ORDER BY f.published_at DESC\n       LIMIT $2", [userId, limit])];
                    case 1:
                        result = _a.sent();
                        // Convert numeric ids to strings
                        return [2 /*return*/, result.rows.map(function (row) {
                                row.id = row.db_id;
                                delete row.db_id;
                                return row;
                            })];
                }
            });
        });
    };
    /**
     * Record a sync attempt
     */
    FeedItemService.prototype.recordSync = function (userId, type, itemCount, success, error) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query("INSERT INTO sync_history (\n        user_id, sync_type, items_synced, success, error_message, completed_at\n      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)", [userId, type, itemCount, success, error || null])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get items for a specific feed
     */
    FeedItemService.prototype.getFeedItems = function (feedId_1) {
        return __awaiter(this, arguments, void 0, function (feedId, limit) {
            var result;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query("SELECT f.*, f.id::text as db_id, \n              p.processed_summary, p.content_type, p.time_sensitive,\n              p.required_background, p.consumption_time_minutes, p.consumption_type,\n              s.is_read, s.is_saved\n       FROM feed_items f\n       LEFT JOIN processed_items p ON p.feed_item_id = f.id\n       LEFT JOIN item_states s ON s.feed_item_id = f.id\n       WHERE f.feed_config_id = $1\n       ORDER BY f.published_at DESC\n       LIMIT $2", [feedId, limit])];
                    case 1:
                        result = _a.sent();
                        // Convert numeric ids to strings
                        return [2 /*return*/, result.rows.map(function (row) {
                                row.id = row.db_id;
                                delete row.db_id;
                                return row;
                            })];
                }
            });
        });
    };
    return FeedItemService;
}());
exports.FeedItemService = FeedItemService;
