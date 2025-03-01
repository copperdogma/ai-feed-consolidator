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
exports.RSSService = exports.RSSErrorCategory = void 0;
var logger_1 = require("../../logger");
var rss_fetcher_1 = require("./rss-fetcher");
// Define error categories as enum values
var RSSErrorCategory;
(function (RSSErrorCategory) {
    RSSErrorCategory["VALIDATION"] = "VALIDATION";
    RSSErrorCategory["UNKNOWN"] = "UNKNOWN";
})(RSSErrorCategory || (exports.RSSErrorCategory = RSSErrorCategory = {}));
var RSSService = /** @class */ (function () {
    function RSSService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getService('pool');
        this.fetcher = serviceContainer.getService('rssFetcher');
        this.parser = serviceContainer.getService('rssParser');
        this.repository = serviceContainer.getService('feedRepository');
        this.feedHealthService = serviceContainer.getService('feedHealthService');
        this.kijijiHandler = serviceContainer.getService('kijijiHandler');
    }
    /**
     * Add a new RSS feed for a user
     */
    RSSService.prototype.addFeed = function (userId, feedUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var validationResult_1, fetchResult, validationResult, feedInfo, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        if (!feedUrl.includes('kijiji.ca')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.kijijiHandler.validateFeed(feedUrl)];
                    case 1:
                        validationResult_1 = _a.sent();
                        if (!validationResult_1.isValid) {
                            throw new Error("Invalid feed: ".concat(validationResult_1.errorDetail || 'Unknown error'));
                        }
                        // Add to database with special handling flag
                        return [2 /*return*/, this.repository.addFeed(userId, feedUrl, validationResult_1.feedInfo || {
                                title: 'Kijiji Feed',
                                description: 'Kijiji RSS Feed',
                                link: feedUrl
                            })];
                    case 2: return [4 /*yield*/, this.fetcher.fetchFeed(feedUrl)];
                    case 3:
                        fetchResult = _a.sent();
                        return [4 /*yield*/, this.parser.validateContent(fetchResult.content)];
                    case 4:
                        validationResult = _a.sent();
                        if (!validationResult.isValid) {
                            throw new Error("Invalid feed: ".concat(validationResult.errorDetail || 'Unknown error'));
                        }
                        return [4 /*yield*/, this.parser.parseFeed(fetchResult.content)];
                    case 5:
                        feedInfo = _a.sent();
                        // Add to database
                        return [2 /*return*/, this.repository.addFeed(userId, feedUrl, feedInfo)];
                    case 6:
                        error_1 = _a.sent();
                        logger_1.logger.error({ error: error_1, userId: userId, feedUrl: feedUrl }, 'Error adding RSS feed');
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get a specific feed for a user
     */
    RSSService.prototype.getFeed = function (userId, feedId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.repository.getFeed(userId, feedId)];
            });
        });
    };
    /**
     * Get all active feeds for a user
     */
    RSSService.prototype.getUserFeeds = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.repository.getUserFeeds(userId)];
            });
        });
    };
    /**
     * Delete a feed for a user
     */
    RSSService.prototype.deleteFeed = function (userId, feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var feed, client, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.repository.getFeed(userId, feedId)];
                    case 1:
                        feed = _a.sent();
                        if (!feed) {
                            throw new Error('Feed not found');
                        }
                        return [4 /*yield*/, this.pool.connect()];
                    case 2:
                        client = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 9, 11, 12]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 4:
                        _a.sent();
                        // Delete feed health
                        return [4 /*yield*/, client.query('DELETE FROM feed_health WHERE feed_config_id = $1', [feedId])];
                    case 5:
                        // Delete feed health
                        _a.sent();
                        // Delete feed items
                        return [4 /*yield*/, client.query('DELETE FROM feed_items WHERE feed_config_id = $1', [feedId])];
                    case 6:
                        // Delete feed items
                        _a.sent();
                        // Delete feed config
                        return [4 /*yield*/, client.query('DELETE FROM feed_configs WHERE id = $1 AND user_id = $2', [feedId, userId])];
                    case 7:
                        // Delete feed config
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 9:
                        error_2 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 10:
                        _a.sent();
                        throw error_2;
                    case 11:
                        client.release();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get feed health information
     */
    RSSService.prototype.getFeedHealth = function (feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 5]);
                        return [4 /*yield*/, client.query('SELECT * FROM feed_health WHERE feed_config_id = $1', [feedId])];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                    case 4:
                        client.release();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update all feeds that are due for update
     */
    RSSService.prototype.updateFeeds = function () {
        return __awaiter(this, void 0, void 0, function () {
            var feeds, _i, feeds_1, feed, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.repository.getFeedsDueForUpdate()];
                    case 1:
                        feeds = _a.sent();
                        logger_1.logger.info({ feedCount: feeds.length }, 'Starting feed updates');
                        _i = 0, feeds_1 = feeds;
                        _a.label = 2;
                    case 2:
                        if (!(_i < feeds_1.length)) return [3 /*break*/, 7];
                        feed = feeds_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.updateFeed(feed)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        logger_1.logger.error({ error: error_3, feedId: feed.id }, 'Error updating feed');
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update a specific feed
     */
    RSSService.prototype.updateFeed = function (feed) {
        return __awaiter(this, void 0, void 0, function () {
            var validationResult_2, feedItems, items_1, savedItems_1, fetchResult, validationResult, error, feedInfo, error, items, savedItems, error_4;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 14, , 19]);
                        logger_1.logger.info({ feedId: feed.id }, 'Starting feed update');
                        if (!feed.feedUrl.includes('kijiji.ca')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.kijijiHandler.validateFeed(feed.feedUrl)];
                    case 1:
                        validationResult_2 = _h.sent();
                        if (!validationResult_2.isValid) {
                            throw new Error("Invalid feed: ".concat(validationResult_2.errorDetail || 'Unknown error'));
                        }
                        return [4 /*yield*/, this.kijijiHandler.fetchFeed(feed.feedUrl)];
                    case 2:
                        feedItems = _h.sent();
                        items_1 = feedItems.map(function (item) { return ({
                            feed_config_id: feed.id,
                            title: item.title,
                            description: item.content,
                            content: item.content,
                            link: item.url,
                            guid: item.id,
                            author: '',
                            categories: [],
                            pub_date: item.publishedAt,
                            created_at: new Date()
                        }); });
                        logger_1.logger.info({
                            feedId: feed.id,
                            itemCount: items_1.length,
                            firstItemTitle: (_a = items_1[0]) === null || _a === void 0 ? void 0 : _a.title,
                            firstItemGuid: (_b = items_1[0]) === null || _b === void 0 ? void 0 : _b.guid
                        }, 'Prepared items for saving');
                        return [4 /*yield*/, this.repository.saveFeedItems(feed.id, items_1)];
                    case 3:
                        savedItems_1 = _h.sent();
                        logger_1.logger.info({
                            feedId: feed.id,
                            savedCount: savedItems_1.length,
                            firstSavedTitle: (_c = savedItems_1[0]) === null || _c === void 0 ? void 0 : _c.title
                        }, 'Items saved to database');
                        // Update feed health
                        return [4 /*yield*/, this.feedHealthService.updateFeedHealth(feed.id, {
                                error_category: undefined,
                                error_detail: undefined,
                                is_permanently_invalid: false,
                                requires_special_handling: true,
                                special_handler_type: 'KIJIJI'
                            })];
                    case 4:
                        // Update feed health
                        _h.sent();
                        logger_1.logger.info({ feedId: feed.id }, 'Feed metadata updated');
                        return [2 /*return*/];
                    case 5: return [4 /*yield*/, this.fetcher.fetchFeed(feed.feedUrl)];
                    case 6:
                        fetchResult = _h.sent();
                        logger_1.logger.info({ feedId: feed.id, contentLength: fetchResult.content.length }, 'Feed content fetched');
                        return [4 /*yield*/, this.parser.validateContent(fetchResult.content)];
                    case 7:
                        validationResult = _h.sent();
                        logger_1.logger.info({ feedId: feed.id, isValid: validationResult.isValid }, 'Feed content validated');
                        if (!validationResult.isValid) {
                            logger_1.logger.warn({ feedId: feed.id, error: validationResult.errorDetail }, 'Feed validation failed');
                            error = new Error(validationResult.errorDetail || 'Invalid feed');
                            error.errorCategory = 'PARSE_ERROR';
                            error.isPermanentlyInvalid = false;
                            throw error;
                        }
                        return [4 /*yield*/, this.parser.parseFeed(fetchResult.content)];
                    case 8:
                        feedInfo = _h.sent();
                        logger_1.logger.info({
                            feedId: feed.id,
                            itemCount: ((_d = feedInfo === null || feedInfo === void 0 ? void 0 : feedInfo.items) === null || _d === void 0 ? void 0 : _d.length) || 0,
                            feedTitle: feedInfo === null || feedInfo === void 0 ? void 0 : feedInfo.title
                        }, 'Feed parsed successfully');
                        if (!(!feedInfo || !feedInfo.items)) return [3 /*break*/, 10];
                        error = new Error('Failed to parse feed');
                        return [4 /*yield*/, this.handleFeedError(feed.id, error.message, 'PARSE_ERROR', false)];
                    case 9:
                        _h.sent();
                        throw error;
                    case 10:
                        items = feedInfo.items.map(function (item) { return ({
                            feed_config_id: feed.id,
                            title: item.title || '',
                            description: item.contentSnippet || item.content || item.description || '',
                            content: item.content || item.contentSnippet || item.description || '',
                            link: item.link || '',
                            guid: item.guid || item.link || '',
                            author: item.creator || '',
                            categories: item.categories || [],
                            pub_date: item.pubDate ? new Date(item.pubDate) : new Date(),
                            created_at: new Date()
                        }); });
                        logger_1.logger.info({
                            feedId: feed.id,
                            itemCount: items.length,
                            firstItemTitle: (_e = items[0]) === null || _e === void 0 ? void 0 : _e.title,
                            firstItemGuid: (_f = items[0]) === null || _f === void 0 ? void 0 : _f.guid
                        }, 'Prepared items for saving');
                        return [4 /*yield*/, this.repository.saveFeedItems(feed.id, items)];
                    case 11:
                        savedItems = _h.sent();
                        logger_1.logger.info({
                            feedId: feed.id,
                            savedCount: savedItems.length,
                            firstSavedTitle: (_g = savedItems[0]) === null || _g === void 0 ? void 0 : _g.title
                        }, 'Items saved to database');
                        // Update feed metadata
                        return [4 /*yield*/, this.repository.updateFeedMetadata(feed.id, feedInfo)];
                    case 12:
                        // Update feed metadata
                        _h.sent();
                        logger_1.logger.info({ feedId: feed.id }, 'Feed metadata updated');
                        // Update feed health
                        return [4 /*yield*/, this.feedHealthService.updateFeedHealth(feed.id, {
                                error_category: undefined,
                                error_detail: undefined,
                                is_permanently_invalid: false,
                                requires_special_handling: false
                            })];
                    case 13:
                        // Update feed health
                        _h.sent();
                        logger_1.logger.info({ feedId: feed.id }, 'Successfully updated feed');
                        return [3 /*break*/, 19];
                    case 14:
                        error_4 = _h.sent();
                        logger_1.logger.error({ error: error_4, feedId: feed.id }, 'Error updating feed');
                        if (!error_4.errorCategory) return [3 /*break*/, 16];
                        return [4 /*yield*/, this.handleFeedError(feed.id, error_4.message || 'Unknown error', error_4.errorCategory, error_4.isPermanentlyInvalid || false)];
                    case 15:
                        _h.sent();
                        return [3 /*break*/, 18];
                    case 16: return [4 /*yield*/, this.handleFeedError(feed.id, error_4.message || 'Unknown error', 'UNKNOWN_ERROR', false)];
                    case 17:
                        _h.sent();
                        _h.label = 18;
                    case 18: throw error_4;
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle feed errors by updating feed health
     */
    RSSService.prototype.handleFeedError = function (feedId, lastError, errorCategory, isPermanentlyInvalid) {
        return __awaiter(this, void 0, void 0, function () {
            var update, updatedHealth, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        update = {
                            lastError: lastError,
                            errorCategory: errorCategory,
                            isPermanentlyInvalid: isPermanentlyInvalid,
                            errorCount: 1
                        };
                        logger_1.logger.info({ feedId: feedId, update: update }, 'Updating feed health with error');
                        return [4 /*yield*/, this.repository.updateFeedHealth(feedId, update)];
                    case 1:
                        updatedHealth = _a.sent();
                        logger_1.logger.info({ feedId: feedId, updatedHealth: updatedHealth }, 'Feed health updated');
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error({ feedId: feedId, error: error_5 }, 'Error updating feed health');
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Poll a specific feed for updates
     */
    RSSService.prototype.pollFeed = function (feedId) {
        return __awaiter(this, void 0, void 0, function () {
            var feed_1, validationResult_3, error, feedItems, items_2, savedItems_2, fetchResult, validationResult, error, feedInfo, error, items, savedItems, error_6, errorCategory, isPermanentlyInvalid, errorMessage, lowerMessage;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 18, , 20]);
                        return [4 /*yield*/, this.repository.getFeedById(feedId)];
                    case 1:
                        feed_1 = _d.sent();
                        if (!feed_1) {
                            throw new Error('Feed not found');
                        }
                        if (!feed_1.feedUrl.includes('kijiji.ca')) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.kijijiHandler.validateFeed(feed_1.feedUrl)];
                    case 2:
                        validationResult_3 = _d.sent();
                        if (!!validationResult_3.isValid) return [3 /*break*/, 4];
                        error = new Error("Invalid feed: ".concat(validationResult_3.errorDetail || 'Unknown error'));
                        return [4 /*yield*/, this.handleFeedError(feed_1.id, error.message, 'PARSE_ERROR', false)];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: {
                                    category: 'PARSE_ERROR',
                                    message: error.message
                                }
                            }];
                    case 4: return [4 /*yield*/, this.kijijiHandler.fetchFeed(feed_1.feedUrl)];
                    case 5:
                        feedItems = _d.sent();
                        items_2 = feedItems.map(function (item) { return ({
                            feed_config_id: feed_1.id,
                            title: item.title,
                            description: item.content,
                            content: item.content,
                            link: item.url,
                            guid: item.id,
                            author: '',
                            categories: [],
                            pub_date: item.publishedAt,
                            created_at: new Date()
                        }); });
                        logger_1.logger.info({
                            feedId: feed_1.id,
                            itemCount: items_2.length,
                            firstItemTitle: (_a = items_2[0]) === null || _a === void 0 ? void 0 : _a.title,
                            firstItemGuid: (_b = items_2[0]) === null || _b === void 0 ? void 0 : _b.guid
                        }, 'Prepared items for saving');
                        return [4 /*yield*/, this.repository.saveFeedItems(feed_1.id, items_2)];
                    case 6:
                        savedItems_2 = _d.sent();
                        logger_1.logger.info({
                            feedId: feed_1.id,
                            savedCount: savedItems_2.length,
                            firstSavedTitle: (_c = savedItems_2[0]) === null || _c === void 0 ? void 0 : _c.title
                        }, 'Items saved to database');
                        // Update feed health
                        return [4 /*yield*/, this.feedHealthService.updateFeedHealth(feed_1.id, {
                                error_category: undefined,
                                error_detail: undefined,
                                is_permanently_invalid: false,
                                requires_special_handling: true,
                                special_handler_type: 'KIJIJI'
                            })];
                    case 7:
                        // Update feed health
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                items: savedItems_2
                            }];
                    case 8: return [4 /*yield*/, this.fetcher.fetchFeed(feed_1.feedUrl)];
                    case 9:
                        fetchResult = _d.sent();
                        return [4 /*yield*/, this.parser.validateContent(fetchResult.content)];
                    case 10:
                        validationResult = _d.sent();
                        if (!!validationResult.isValid) return [3 /*break*/, 12];
                        error = new rss_fetcher_1.RSSFetchError({
                            message: validationResult.errorDetail || 'Invalid feed',
                            errorCategory: 'PARSE_ERROR',
                            isPermanentlyInvalid: false
                        });
                        return [4 /*yield*/, this.handleFeedError(feed_1.id, error.message, error.errorCategory, error.isPermanentlyInvalid)];
                    case 11:
                        _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: {
                                    category: error.errorCategory,
                                    message: error.message
                                }
                            }];
                    case 12: return [4 /*yield*/, this.parser.parseFeed(fetchResult.content)];
                    case 13:
                        feedInfo = _d.sent();
                        if (!(!feedInfo || !feedInfo.items)) return [3 /*break*/, 15];
                        error = new rss_fetcher_1.RSSFetchError({
                            message: 'Failed to parse feed',
                            errorCategory: 'PARSE_ERROR',
                            isPermanentlyInvalid: false
                        });
                        return [4 /*yield*/, this.handleFeedError(feed_1.id, error.message, error.errorCategory, error.isPermanentlyInvalid)];
                    case 14:
                        _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: {
                                    category: error.errorCategory,
                                    message: error.message
                                }
                            }];
                    case 15:
                        items = feedInfo.items.map(function (item) { return ({
                            feed_config_id: feed_1.id,
                            title: item.title || '',
                            description: item.contentSnippet || item.content || item.description || '',
                            content: item.content || item.contentSnippet || item.description || '',
                            link: item.link || '',
                            guid: item.guid || item.link || '',
                            author: item.creator || '',
                            categories: item.categories || [],
                            pub_date: item.pubDate ? new Date(item.pubDate) : new Date(),
                            created_at: new Date()
                        }); });
                        return [4 /*yield*/, this.repository.saveFeedItems(feed_1.id, items)];
                    case 16:
                        savedItems = _d.sent();
                        // Update feed health
                        return [4 /*yield*/, this.feedHealthService.updateFeedHealth(feed_1.id, {
                                error_category: undefined,
                                error_detail: undefined,
                                is_permanently_invalid: false
                            })];
                    case 17:
                        // Update feed health
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                items: savedItems
                            }];
                    case 18:
                        error_6 = _d.sent();
                        logger_1.logger.error({ error: error_6, feedId: feedId }, 'Error polling feed');
                        errorCategory = 'UNKNOWN_ERROR';
                        isPermanentlyInvalid = false;
                        errorMessage = 'Unknown error';
                        if (error_6 instanceof rss_fetcher_1.RSSFetchError) {
                            errorCategory = error_6.errorCategory;
                            isPermanentlyInvalid = error_6.isPermanentlyInvalid;
                            errorMessage = error_6.message;
                        }
                        else if (error_6 instanceof Error) {
                            lowerMessage = error_6.message.toLowerCase();
                            // Check for specific error types
                            if (lowerMessage.includes('invalid xml') || lowerMessage.includes('failed to parse')) {
                                errorCategory = 'PARSE_ERROR';
                            }
                            else if (lowerMessage.includes('enotfound') ||
                                lowerMessage.includes('econnrefused') ||
                                lowerMessage.includes('network error') ||
                                lowerMessage.includes('failed to fetch')) {
                                errorCategory = 'NETWORK_ERROR';
                            }
                            else if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
                                errorCategory = 'TIMEOUT';
                            }
                            errorMessage = error_6.message;
                        }
                        return [4 /*yield*/, this.handleFeedError(feedId, errorMessage, errorCategory, isPermanentlyInvalid)];
                    case 19:
                        _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: {
                                    category: errorCategory,
                                    message: errorMessage
                                }
                            }];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    return RSSService;
}());
exports.RSSService = RSSService;
