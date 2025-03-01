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
exports.RSSParser = void 0;
var rss_parser_1 = require("rss-parser");
var logger_1 = require("../../logger");
var rss_fetcher_1 = require("./rss-fetcher");
var PARSE_TIMEOUT = process.env.NODE_ENV === 'test' ? 5000 : 15000; // 5s for tests, 15s for prod
var ExtendedRSSParser = /** @class */ (function () {
    function ExtendedRSSParser(options) {
        this.parser = new rss_parser_1.default(options);
    }
    ExtendedRSSParser.prototype.parse = function (text) {
        return this.parser.parseString(text);
    };
    ExtendedRSSParser.prototype.parseURL = function (url) {
        return this.parser.parseURL(url);
    };
    return ExtendedRSSParser;
}());
var RSSParser = /** @class */ (function () {
    function RSSParser() {
        this.parser = new ExtendedRSSParser({
            timeout: PARSE_TIMEOUT,
            customFields: {
                item: ['media:content', 'content:encoded', 'description']
            }
        });
    }
    /**
     * Parse RSS feed content and return feed information
     */
    RSSParser.prototype.parseFeed = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var feed, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // First try to parse as XML
                        if (!content.trim().startsWith('<?xml')) {
                            throw new rss_fetcher_1.RSSFetchError({
                                message: 'Invalid XML: Document does not start with XML declaration',
                                errorCategory: 'PARSE_ERROR',
                                isTransient: false,
                                isPermanentlyInvalid: false
                            });
                        }
                        return [4 /*yield*/, this.parser.parse(content)];
                    case 1:
                        feed = _a.sent();
                        if (!feed.items || feed.items.length === 0) {
                            throw new rss_fetcher_1.RSSFetchError({
                                message: 'Feed contains no items',
                                errorCategory: 'PARSE_ERROR',
                                isTransient: false,
                                isPermanentlyInvalid: false
                            });
                        }
                        return [2 /*return*/, {
                                title: feed.title,
                                description: feed.description,
                                link: feed.link,
                                items: feed.items.map(function (item) { return ({
                                    title: item.title || '',
                                    description: item.contentSnippet || item.content || item.description || '',
                                    link: item.link || '',
                                    guid: item.guid || item.link || '', // Use link as fallback for guid
                                    pubDate: item.pubDate || item.isoDate || new Date().toISOString()
                                }); })
                            }];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error({ error: error_1 }, 'Failed to parse RSS feed content');
                        if (error_1 instanceof rss_fetcher_1.RSSFetchError) {
                            throw error_1;
                        }
                        // Handle XML parsing errors
                        if (error_1 instanceof Error && (error_1.name === 'ParseError' ||
                            error_1.message.includes('Invalid') ||
                            error_1.message.includes('Failed to parse') ||
                            error_1.message.includes('XML'))) {
                            throw new rss_fetcher_1.RSSFetchError({
                                message: 'Invalid XML: Failed to parse feed content',
                                errorCategory: 'PARSE_ERROR',
                                isTransient: false,
                                isPermanentlyInvalid: false,
                                originalError: error_1
                            });
                        }
                        // Handle other parsing errors
                        throw new rss_fetcher_1.RSSFetchError({
                            message: error_1 instanceof Error ? error_1.message : 'Failed to parse feed content',
                            errorCategory: 'PARSE_ERROR',
                            isTransient: false,
                            isPermanentlyInvalid: false,
                            originalError: error_1 instanceof Error ? error_1 : null
                        });
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate feed content by attempting to parse it
     */
    RSSParser.prototype.validateContent = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var feedInfo, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.parseFeed(content)];
                    case 1:
                        feedInfo = _a.sent();
                        return [2 /*return*/, {
                                url: '', // URL will be filled in by the caller
                                isValid: true,
                                feedInfo: feedInfo
                            }];
                    case 2:
                        error_2 = _a.sent();
                        if (error_2 instanceof rss_fetcher_1.RSSFetchError) {
                            return [2 /*return*/, {
                                    url: '', // URL will be filled in by the caller
                                    isValid: false,
                                    errorCategory: error_2.errorCategory,
                                    errorDetail: error_2.message
                                }];
                        }
                        return [2 /*return*/, {
                                url: '', // URL will be filled in by the caller
                                isValid: false,
                                errorCategory: 'PARSE_ERROR',
                                errorDetail: error_2 instanceof Error ? error_2.message : 'Failed to parse feed content'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return RSSParser;
}());
exports.RSSParser = RSSParser;
