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
exports.OpenAIService = exports.OpenAIError = void 0;
var openai_1 = require("openai");
var config_1 = require("../config");
var logger_1 = require("../logger");
var OpenAIError = /** @class */ (function (_super) {
    __extends(OpenAIError, _super);
    function OpenAIError(message, cause, details) {
        var _this = _super.call(this, message) || this;
        _this.cause = cause;
        _this.details = details;
        _this.name = 'OpenAIError';
        return _this;
    }
    return OpenAIError;
}(Error));
exports.OpenAIError = OpenAIError;
var OpenAIService = /** @class */ (function () {
    function OpenAIService(serviceContainer) {
        var _a;
        this.serviceContainer = serviceContainer;
        logger_1.logger.info('Initializing OpenAIService');
        this.pool = serviceContainer.getPool();
        if (!((_a = config_1.config.openai) === null || _a === void 0 ? void 0 : _a.apiKey)) {
            throw new OpenAIError('OpenAI API key is not configured');
        }
        this.client = new openai_1.OpenAI({
            apiKey: config_1.config.openai.apiKey,
            dangerouslyAllowBrowser: process.env.NODE_ENV === 'test' // Allow browser environment in tests
        });
    }
    OpenAIService.prototype.createSummary = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var completion, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!content) {
                            throw new OpenAIError('No content provided');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.chat.completions.create({
                                model: 'gpt-4-turbo-preview',
                                messages: [
                                    {
                                        role: 'system',
                                        content: "You are a precise content analyzer that creates concise, informative summaries.\n\nGuidelines:\n1. Provide a 1-3 sentence summary that captures the essential information. Each sentence should be concise and focused.\n2. Determine the content type (technical, news, analysis, tutorial, entertainment).\n3. Assess if the content is time-sensitive (true/false).\n4. List any required background knowledge as an array of strings.\n5. Estimate consumption time in minutes and type (read/watch/listen).\n\nRespond in JSON format:\n{\n  \"summary\": \"string\",\n  \"content_type\": \"technical|news|analysis|tutorial|entertainment\",\n  \"time_sensitive\": boolean,\n  \"requires_background\": [\"string\"],\n  \"consumption_time\": {\n    \"minutes\": number,\n    \"type\": \"read|watch|listen\"\n  }\n}"
                                    },
                                    {
                                        role: 'user',
                                        content: content
                                    }
                                ],
                                response_format: { type: 'json_object' }
                            })];
                    case 2:
                        completion = _a.sent();
                        response = JSON.parse(completion.choices[0].message.content || '{}');
                        return [2 /*return*/, response];
                    case 3:
                        error_1 = _a.sent();
                        throw new OpenAIError('Failed to generate summary', error_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return OpenAIService;
}());
exports.OpenAIService = OpenAIService;
