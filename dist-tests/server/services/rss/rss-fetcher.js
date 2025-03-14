"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.RSSFetcher = exports.RSSFetchError = void 0;
var RSSFetchError = /** @class */ (function (_super) {
    __extends(RSSFetchError, _super);
    function RSSFetchError(options) {
        var _this = _super.call(this, options.message) || this;
        _this.originalError = options.originalError || null;
        _this.isTransient = options.isTransient || false;
        _this.errorCategory = options.errorCategory;
        _this.isPermanentlyInvalid = options.isPermanentlyInvalid || false;
        _this.name = 'RSSFetchError';
        return _this;
    }
    return RSSFetchError;
}(Error));
exports.RSSFetchError = RSSFetchError;
var FEED_FETCH_TIMEOUT = 30000; // 30 seconds
var DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; RSSFeedReader/1.0; +https://example.com/bot)'
};
var RSSFetcher = /** @class */ (function () {
    function RSSFetcher(options) {
        if (options === void 0) { options = {}; }
        this.userAgent = options.userAgent || 'AI Feed Consolidator/1.0';
        this.fallbackUserAgent = options.fallbackUserAgent || 'Mozilla/5.0 (compatible; RSSFeedReader/1.0; +https://example.com/bot)';
        this.timeout = options.timeoutMs || 15000;
    }
    /**
     * Fetch RSS feed content from a URL
     */
    RSSFetcher.prototype.fetchFeed = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, fallbackError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!url) {
                            throw new RSSFetchError({
                                message: 'Feed URL is required',
                                isTransient: false,
                                errorCategory: 'VALIDATION_ERROR',
                                isPermanentlyInvalid: true
                            });
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 8]);
                        return [4 /*yield*/, this.fetchWithUserAgent(url, this.userAgent)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        if (!(error_1 instanceof RSSFetchError && error_1.errorCategory === 'AUTH_ERROR')) return [3 /*break*/, 7];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.fetchWithUserAgent(url, this.fallbackUserAgent)];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        fallbackError_1 = _a.sent();
                        // If fallback also fails, throw the original error
                        throw error_1;
                    case 7: throw error_1;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    RSSFetcher.prototype.fetchWithUserAgent = function (url, userAgent) {
        return __awaiter(this, void 0, void 0, function () {
            var controller, timeoutId, response, status_1, errorCategory, isPermanentlyInvalid, isTransient, content, headers, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        controller = new AbortController();
                        timeoutId = setTimeout(function () { return controller.abort(); }, this.timeout);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch(url, {
                                signal: controller.signal,
                                headers: {
                                    'User-Agent': userAgent,
                                    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
                                }
                            })];
                    case 2:
                        response = _a.sent();
                        clearTimeout(timeoutId);
                        if (!response.ok) {
                            status_1 = response.status;
                            errorCategory = void 0;
                            isPermanentlyInvalid = false;
                            isTransient = false;
                            // Categorize HTTP status codes
                            if (status_1 === 408 || status_1 === 504) {
                                errorCategory = 'TIMEOUT';
                                isTransient = true;
                            }
                            else if (status_1 >= 500) {
                                errorCategory = 'NETWORK_ERROR';
                                isTransient = true;
                            }
                            else if (status_1 === 404) {
                                errorCategory = 'HTTP_STATUS';
                                isPermanentlyInvalid = true;
                            }
                            else if (status_1 === 403 || status_1 === 401) {
                                errorCategory = 'AUTH_ERROR';
                                isPermanentlyInvalid = false; // Changed to false since we might retry with fallback
                            }
                            else {
                                errorCategory = 'HTTP_STATUS';
                                isTransient = status_1 >= 500;
                                isPermanentlyInvalid = status_1 < 500;
                            }
                            throw new RSSFetchError({
                                message: "HTTP ".concat(status_1, ": ").concat(response.statusText),
                                isTransient: isTransient,
                                errorCategory: errorCategory,
                                isPermanentlyInvalid: isPermanentlyInvalid
                            });
                        }
                        return [4 /*yield*/, response.text()];
                    case 3:
                        content = _a.sent();
                        if (!content.trim()) {
                            throw new RSSFetchError({
                                message: 'Empty response received',
                                isTransient: false,
                                errorCategory: 'EMPTY_RESPONSE',
                                isPermanentlyInvalid: true
                            });
                        }
                        headers = Object.fromEntries(response.headers.entries());
                        return [2 /*return*/, {
                                content: content,
                                statusCode: response.status,
                                headers: headers
                            }];
                    case 4:
                        error_2 = _a.sent();
                        // Handle abort/timeout errors
                        if (error_2 instanceof Error && error_2.name === 'AbortError') {
                            throw new RSSFetchError({
                                message: 'Request timed out',
                                originalError: error_2,
                                isTransient: true,
                                errorCategory: 'TIMEOUT',
                                isPermanentlyInvalid: false
                            });
                        }
                        // If it's already an RSSFetchError, just rethrow it
                        if (error_2 instanceof RSSFetchError) {
                            throw error_2;
                        }
                        // Handle other errors
                        throw new RSSFetchError({
                            message: error_2 instanceof Error ? error_2.message : 'Unknown error occurred',
                            originalError: error_2 instanceof Error ? error_2 : null,
                            isTransient: true,
                            errorCategory: 'UNKNOWN_ERROR',
                            isPermanentlyInvalid: false
                        });
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate a feed URL by attempting to fetch it
     */
    RSSFetcher.prototype.validateFeed = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3, categorizedError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.fetchFeed(url)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                url: url,
                                isValid: true,
                                statusCode: result.statusCode,
                                contentType: result.headers['content-type']
                            }];
                    case 2:
                        error_3 = _a.sent();
                        if (error_3 instanceof RSSFetchError) {
                            return [2 /*return*/, {
                                    url: url,
                                    isValid: false,
                                    errorCategory: error_3.errorCategory,
                                    errorDetail: error_3.message,
                                    statusCode: this.getStatusCodeForError(error_3),
                                    isPermanentlyInvalid: error_3.isPermanentlyInvalid
                                }];
                        }
                        categorizedError = this.categorizeFetchError(error_3);
                        return [2 /*return*/, {
                                url: url,
                                isValid: false,
                                errorCategory: categorizedError.errorCategory,
                                errorDetail: categorizedError.message,
                                statusCode: this.getStatusCodeForError(categorizedError),
                                isPermanentlyInvalid: categorizedError.isPermanentlyInvalid
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RSSFetcher.prototype.getStatusCodeForError = function (error) {
        switch (error.errorCategory) {
            case 'TIMEOUT':
                return 408;
            case 'DNS_ERROR':
                return 523;
            case 'SSL_ERROR':
                return 525;
            case 'PARSE_ERROR':
                return 422;
            case 'NETWORK_ERROR':
                return 503;
            default:
                return 500;
        }
    };
    RSSFetcher.prototype.categorizeFetchError = function (error) {
        if (error instanceof RSSFetchError) {
            return error;
        }
        if (error instanceof Error) {
            var errorMessage = error.message.toLowerCase();
            var errorCode = error.code;
            // Handle timeout errors
            if (error.name === 'AbortError' ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('abort') ||
                errorCode === 'ETIMEDOUT' ||
                errorMessage.includes('timed out')) {
                return new RSSFetchError({
                    message: 'Request timed out while fetching feed',
                    originalError: error,
                    isTransient: true,
                    errorCategory: 'TIMEOUT',
                    isPermanentlyInvalid: false
                });
            }
            // Handle DNS errors
            if (errorMessage.includes('dns') ||
                errorMessage.includes('getaddrinfo') ||
                errorCode === 'ENOTFOUND' ||
                errorMessage.includes('enotfound')) {
                return new RSSFetchError({
                    message: 'DNS resolution error while fetching feed',
                    originalError: error,
                    isTransient: false,
                    errorCategory: 'DNS_ERROR',
                    isPermanentlyInvalid: true
                });
            }
            // Handle SSL errors
            if (errorMessage.includes('ssl') ||
                errorMessage.includes('certificate') ||
                errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
                errorMessage.includes('unable to verify')) {
                return new RSSFetchError({
                    message: 'SSL certificate error while fetching feed',
                    originalError: error,
                    isTransient: true,
                    errorCategory: 'SSL_ERROR',
                    isPermanentlyInvalid: false
                });
            }
            // Handle network errors
            if (errorMessage.includes('network') ||
                errorMessage.includes('fetch') ||
                errorCode === 'ECONNRESET' ||
                errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('failed to fetch')) {
                return new RSSFetchError({
                    message: 'Network error while fetching feed',
                    originalError: error,
                    isTransient: true,
                    errorCategory: 'NETWORK_ERROR',
                    isPermanentlyInvalid: false
                });
            }
            // Handle parse errors
            if (errorMessage.includes('parse') ||
                errorMessage.includes('invalid xml') ||
                errorMessage.includes('syntax error')) {
                return new RSSFetchError({
                    message: 'Failed to parse feed content',
                    originalError: error,
                    isTransient: false,
                    errorCategory: 'PARSE_ERROR',
                    isPermanentlyInvalid: false
                });
            }
        }
        // Default error handling
        return new RSSFetchError({
            message: 'Unknown error while fetching feed',
            originalError: error instanceof Error ? error : null,
            isTransient: true,
            errorCategory: 'UNKNOWN_ERROR',
            isPermanentlyInvalid: false
        });
    };
    return RSSFetcher;
}());
exports.RSSFetcher = RSSFetcher;
