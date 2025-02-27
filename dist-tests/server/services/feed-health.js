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
exports.FeedHealthService = void 0;
var logger_1 = require("../logger");
var FeedHealthService = /** @class */ (function () {
    function FeedHealthService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
    }
    /**
     * Create or update feed health record
     */
    FeedHealthService.prototype.updateFeedHealth = function (feedConfigId, params) {
        return __awaiter(this, void 0, void 0, function () {
            var client, numericFeedConfigId, feedConfigExists, existingResult, result, currentRecord, isNewError, isSuccess, consecutiveFailures, isPermanentlyInvalid, requiresSpecialHandling, specialHandlerType, record, feedHealth, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _a.sent();
                        numericFeedConfigId = Number(feedConfigId);
                        if (isNaN(numericFeedConfigId)) {
                            logger_1.logger.error('Invalid feed config ID:', feedConfigId);
                            throw new Error('Invalid feed config ID');
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 11, 13, 14]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, client.query('SELECT EXISTS(SELECT 1 FROM feed_configs WHERE id = $1)', [numericFeedConfigId])];
                    case 4:
                        feedConfigExists = _a.sent();
                        if (!feedConfigExists.rows[0].exists) {
                            logger_1.logger.error("Feed config with ID ".concat(numericFeedConfigId, " not found"));
                            throw new Error("Feed config with ID ".concat(numericFeedConfigId, " not found"));
                        }
                        logger_1.logger.info("Updating feed health for config ".concat(numericFeedConfigId), { params: params });
                        return [4 /*yield*/, client.query('SELECT * FROM feed_health WHERE feed_config_id = $1', [numericFeedConfigId])];
                    case 5:
                        existingResult = _a.sent();
                        result = void 0;
                        if (!(existingResult.rows.length === 0)) return [3 /*break*/, 7];
                        logger_1.logger.info("Creating new feed health record for config ".concat(numericFeedConfigId));
                        return [4 /*yield*/, client.query("INSERT INTO feed_health (\n            feed_config_id,\n            last_check_at,\n            consecutive_failures,\n            last_error_category,\n            last_error_detail,\n            is_permanently_invalid,\n            requires_special_handling,\n            special_handler_type,\n            created_at,\n            updated_at\n          ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, NOW(), NOW())\n          RETURNING *", [
                                numericFeedConfigId,
                                params.error_category ? 1 : 0,
                                params.error_category || null,
                                params.error_detail || null,
                                params.is_permanently_invalid || false,
                                params.requires_special_handling || false,
                                params.special_handler_type || null
                            ])];
                    case 6:
                        // Create new record
                        result = _a.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        logger_1.logger.info("Updating existing feed health record for config ".concat(numericFeedConfigId));
                        currentRecord = existingResult.rows[0];
                        isNewError = params.error_category !== undefined;
                        isSuccess = !isNewError;
                        consecutiveFailures = currentRecord.consecutive_failures;
                        if (isSuccess) {
                            consecutiveFailures = 0;
                        }
                        else if (isNewError) {
                            consecutiveFailures++;
                        }
                        isPermanentlyInvalid = params.is_permanently_invalid === true ||
                            currentRecord.is_permanently_invalid;
                        requiresSpecialHandling = params.requires_special_handling === true ||
                            currentRecord.requires_special_handling ||
                            params.error_category === 'SSL_ERROR' ||
                            params.error_category === 'PARSE_ERROR';
                        specialHandlerType = requiresSpecialHandling
                            ? (params.special_handler_type || currentRecord.special_handler_type)
                            : null;
                        return [4 /*yield*/, client.query("UPDATE feed_health\n           SET last_check_at = NOW(),\n               consecutive_failures = $1,\n               last_error_category = $2,\n               last_error_detail = $3,\n               is_permanently_invalid = $4,\n               requires_special_handling = $5,\n               special_handler_type = $6,\n               updated_at = NOW()\n           WHERE feed_config_id = $7\n           RETURNING *", [
                                consecutiveFailures,
                                isSuccess ? null : (params.error_category || currentRecord.last_error_category),
                                isSuccess ? null : (params.error_detail || currentRecord.last_error_detail),
                                isPermanentlyInvalid,
                                requiresSpecialHandling,
                                specialHandlerType,
                                numericFeedConfigId
                            ])];
                    case 8:
                        result = _a.sent();
                        _a.label = 9;
                    case 9: return [4 /*yield*/, client.query('COMMIT')];
                    case 10:
                        _a.sent();
                        record = result.rows[0];
                        if (!record) {
                            logger_1.logger.error('No record returned after update/insert', { feedConfigId: numericFeedConfigId, params: params });
                            throw new Error('No record returned after update/insert');
                        }
                        feedHealth = {
                            id: record.id,
                            feed_config_id: record.feed_config_id,
                            last_check_at: record.last_check_at,
                            consecutive_failures: record.consecutive_failures,
                            last_error_category: record.last_error_category,
                            last_error_detail: record.last_error_detail,
                            is_permanently_invalid: record.is_permanently_invalid,
                            requires_special_handling: record.requires_special_handling,
                            special_handler_type: record.special_handler_type,
                            created_at: record.created_at,
                            updated_at: record.updated_at
                        };
                        logger_1.logger.info("Successfully updated feed health for config ".concat(numericFeedConfigId), feedHealth);
                        return [2 /*return*/, feedHealth];
                    case 11:
                        error_1 = _a.sent();
                        logger_1.logger.error('Error updating feed health:', error_1, { feedConfigId: numericFeedConfigId, params: params });
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 12:
                        _a.sent();
                        throw error_1;
                    case 13:
                        client.release();
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get feed health record
     */
    FeedHealthService.prototype.getFeedHealth = function (feedConfigId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, record, feedHealth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query('SELECT * FROM feed_health WHERE feed_config_id = $1', [feedConfigId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            logger_1.logger.info("No feed health record found for config ".concat(feedConfigId));
                            return [2 /*return*/, null];
                        }
                        record = result.rows[0];
                        feedHealth = {
                            id: record.id,
                            feed_config_id: record.feed_config_id,
                            last_check_at: record.last_check_at,
                            consecutive_failures: record.consecutive_failures,
                            last_error_category: record.last_error_category,
                            last_error_detail: record.last_error_detail,
                            is_permanently_invalid: record.is_permanently_invalid,
                            requires_special_handling: record.requires_special_handling,
                            special_handler_type: record.special_handler_type,
                            created_at: record.created_at,
                            updated_at: record.updated_at
                        };
                        logger_1.logger.info("Retrieved feed health record for config ".concat(feedConfigId), feedHealth);
                        return [2 /*return*/, feedHealth];
                }
            });
        });
    };
    /**
     * Get all feeds requiring special handling
     */
    FeedHealthService.prototype.getSpecialHandlingFeeds = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, feeds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query('SELECT * FROM feed_health WHERE requires_special_handling = true')];
                    case 1:
                        result = _a.sent();
                        feeds = result.rows.map(function (record) { return ({
                            id: record.id,
                            feed_config_id: record.feed_config_id,
                            last_check_at: record.last_check_at,
                            consecutive_failures: record.consecutive_failures,
                            last_error_category: record.last_error_category,
                            last_error_detail: record.last_error_detail,
                            is_permanently_invalid: record.is_permanently_invalid,
                            requires_special_handling: record.requires_special_handling,
                            special_handler_type: record.special_handler_type,
                            created_at: record.created_at,
                            updated_at: record.updated_at
                        }); });
                        logger_1.logger.info("Found ".concat(feeds.length, " feeds requiring special handling"));
                        return [2 /*return*/, feeds];
                }
            });
        });
    };
    /**
     * Get all permanently invalid feeds
     */
    FeedHealthService.prototype.getPermanentlyInvalidFeeds = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, feeds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.query('SELECT * FROM feed_health WHERE is_permanently_invalid = true')];
                    case 1:
                        result = _a.sent();
                        feeds = result.rows.map(function (record) { return ({
                            id: record.id,
                            feed_config_id: record.feed_config_id,
                            last_check_at: record.last_check_at,
                            consecutive_failures: record.consecutive_failures,
                            last_error_category: record.last_error_category,
                            last_error_detail: record.last_error_detail,
                            is_permanently_invalid: record.is_permanently_invalid,
                            requires_special_handling: record.requires_special_handling,
                            special_handler_type: record.special_handler_type,
                            created_at: record.created_at,
                            updated_at: record.updated_at
                        }); });
                        logger_1.logger.info("Found ".concat(feeds.length, " permanently invalid feeds"));
                        return [2 /*return*/, feeds];
                }
            });
        });
    };
    return FeedHealthService;
}());
exports.FeedHealthService = FeedHealthService;
