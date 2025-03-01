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
exports.OPMLService = void 0;
var xml2js_1 = require("xml2js");
var util_1 = require("util");
var logger_1 = require("../logger");
var parseXML = (0, util_1.promisify)(xml2js_1.parseString);
var OPMLService = /** @class */ (function () {
    function OPMLService(serviceContainer) {
        this.serviceContainer = serviceContainer;
        logger_1.logger.info('Initializing OPMLService');
        this.pool = serviceContainer.getPool();
        this.rssService = serviceContainer.getService('rssService');
    }
    /**
     * Import feeds from OPML content
     */
    OPMLService.prototype.importOPML = function (userId, opmlContent) {
        return __awaiter(this, void 0, void 0, function () {
            var result, opml, error_1, feeds, _i, feeds_1, feed, error_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {
                            added: 0,
                            failed: 0,
                            errors: []
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 12, , 13]);
                        opml = void 0;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, parseXML(opmlContent)];
                    case 3:
                        opml = _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        logger_1.logger.error({ error: error_1 }, 'Failed to parse OPML file');
                        throw new Error('Invalid OPML file format');
                    case 5:
                        if (!this.isValidOPMLRoot(opml)) {
                            throw new Error('Invalid OPML file format');
                        }
                        feeds = this.extractFeeds(opml);
                        _i = 0, feeds_1 = feeds;
                        _a.label = 6;
                    case 6:
                        if (!(_i < feeds_1.length)) return [3 /*break*/, 11];
                        feed = feeds_1[_i];
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.rssService.addFeed(userId, feed.xmlUrl)];
                    case 8:
                        _a.sent();
                        result.added++;
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _a.sent();
                        result.failed++;
                        result.errors.push({
                            url: feed.xmlUrl,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        });
                        return [3 /*break*/, 10];
                    case 10:
                        _i++;
                        return [3 /*break*/, 6];
                    case 11: return [2 /*return*/, result];
                    case 12:
                        error_3 = _a.sent();
                        if (error_3 instanceof Error && error_3.message === 'Invalid OPML file format') {
                            throw error_3;
                        }
                        logger_1.logger.error({ error: error_3 }, 'Failed to process OPML file');
                        throw new Error('Invalid OPML file format');
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Type guard for OPML root object
     */
    OPMLService.prototype.isValidOPMLRoot = function (obj) {
        return (obj &&
            typeof obj === 'object' &&
            obj.opml &&
            Array.isArray(obj.opml.body) &&
            obj.opml.body.length > 0 &&
            obj.opml.body[0].outline);
    };
    /**
     * Extract feed URLs from OPML structure
     */
    OPMLService.prototype.extractFeeds = function (opml) {
        var feeds = [];
        var outlines = opml.opml.body[0].outline;
        var processOutline = function (outline) {
            if (outline.$ && outline.$.type === 'rss' && outline.$.xmlUrl) {
                feeds.push({ xmlUrl: outline.$.xmlUrl });
            }
            if (outline.outline) {
                outline.outline.forEach(processOutline);
            }
        };
        outlines.forEach(processOutline);
        return feeds;
    };
    return OPMLService;
}());
exports.OPMLService = OPMLService;
