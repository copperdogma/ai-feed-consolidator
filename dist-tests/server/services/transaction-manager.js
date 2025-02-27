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
exports.TransactionManager = void 0;
var pino_1 = require("pino");
var logger = (0, pino_1.default)({ name: 'TransactionManager' });
// Error codes from PostgreSQL that we want to handle specially
var ERROR_CODES = {
    DEADLOCK_DETECTED: '40P01',
    LOCK_TIMEOUT: '55P03',
    STATEMENT_TIMEOUT: '57014',
    SERIALIZATION_FAILURE: '40001',
    DUPLICATE_KEY: '23505'
};
var DEFAULT_OPTIONS = {
    maxRetries: 5,
    statementTimeout: 30000,
    lockTimeout: 15000,
    isolationLevel: 'READ COMMITTED',
    readOnly: false
};
var TransactionManager = /** @class */ (function () {
    function TransactionManager(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.pool = serviceContainer.getPool();
        this.activeTransactions = new Map();
    }
    /**
     * Execute a callback within a transaction with automatic retries for deadlocks
     */
    TransactionManager.prototype.withTransaction = function (callback_1) {
        return __awaiter(this, arguments, void 0, function (callback, options) {
            var finalOptions, attempt, lastError, client, transactionCount, result_1, result, error_1, rollbackError_1, shouldRetry, transactionCount;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        finalOptions = __assign(__assign({}, DEFAULT_OPTIONS), options);
                        attempt = 0;
                        lastError = null;
                        client = null;
                        _a.label = 1;
                    case 1:
                        if (!(attempt < finalOptions.maxRetries)) return [3 /*break*/, 22];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 13, 20, 21]);
                        return [4 /*yield*/, this.pool.connect()];
                    case 3:
                        client = _a.sent();
                        transactionCount = this.activeTransactions.get(client) || 0;
                        if (!(transactionCount > 0)) return [3 /*break*/, 5];
                        // This is a nested transaction, just execute the callback
                        this.activeTransactions.set(client, transactionCount + 1);
                        return [4 /*yield*/, callback(client)];
                    case 4:
                        result_1 = _a.sent();
                        this.activeTransactions.set(client, transactionCount);
                        return [2 /*return*/, result_1];
                    case 5:
                        // Start new transaction
                        this.activeTransactions.set(client, 1);
                        // Start transaction with specified isolation level
                        return [4 /*yield*/, client.query("BEGIN ISOLATION LEVEL ".concat(finalOptions.isolationLevel))];
                    case 6:
                        // Start transaction with specified isolation level
                        _a.sent();
                        // Set transaction-level timeouts
                        return [4 /*yield*/, client.query("SET LOCAL statement_timeout = ".concat(finalOptions.statementTimeout))];
                    case 7:
                        // Set transaction-level timeouts
                        _a.sent();
                        return [4 /*yield*/, client.query("SET LOCAL lock_timeout = ".concat(finalOptions.lockTimeout))];
                    case 8:
                        _a.sent();
                        if (!finalOptions.readOnly) return [3 /*break*/, 10];
                        return [4 /*yield*/, client.query('SET TRANSACTION READ ONLY')];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10: return [4 /*yield*/, callback(client)];
                    case 11:
                        result = _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 12:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 13:
                        error_1 = _a.sent();
                        if (!client) return [3 /*break*/, 17];
                        _a.label = 14;
                    case 14:
                        _a.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 15:
                        _a.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        rollbackError_1 = _a.sent();
                        logger.error({ error: rollbackError_1 }, 'Error during rollback');
                        return [3 /*break*/, 17];
                    case 17:
                        lastError = error_1;
                        shouldRetry = this.shouldRetryTransaction(error_1);
                        if (!(shouldRetry && attempt < finalOptions.maxRetries - 1)) return [3 /*break*/, 19];
                        attempt++;
                        // Wait with exponential backoff before retrying
                        return [4 /*yield*/, this.wait(attempt)];
                    case 18:
                        // Wait with exponential backoff before retrying
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 19:
                        // Log the error with context
                        logger.error({
                            error: error_1,
                            attempt: attempt,
                            maxRetries: finalOptions.maxRetries,
                            isolationLevel: finalOptions.isolationLevel
                        }, 'Transaction failed');
                        throw error_1;
                    case 20:
                        if (client) {
                            transactionCount = this.activeTransactions.get(client) || 0;
                            if (transactionCount <= 1) {
                                this.activeTransactions.delete(client);
                                client.release();
                            }
                            else {
                                this.activeTransactions.set(client, transactionCount - 1);
                            }
                        }
                        return [7 /*endfinally*/];
                    case 21: return [3 /*break*/, 1];
                    case 22: 
                    // This should never be reached due to the throw in the catch block
                    throw new Error("Transaction failed after ".concat(finalOptions.maxRetries, " attempts. Last error: ").concat(lastError === null || lastError === void 0 ? void 0 : lastError.message));
                }
            });
        });
    };
    /**
     * Execute a read-only transaction with READ COMMITTED isolation
     */
    TransactionManager.prototype.withReadTransaction = function (callback_1) {
        return __awaiter(this, arguments, void 0, function (callback, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(callback, __assign(__assign({}, options), { readOnly: true, isolationLevel: 'READ COMMITTED' }))];
            });
        });
    };
    /**
     * Execute a write transaction with specified isolation level
     */
    TransactionManager.prototype.withWriteTransaction = function (callback_1) {
        return __awaiter(this, arguments, void 0, function (callback, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withTransaction(callback, __assign(__assign({}, options), { readOnly: false }))];
            });
        });
    };
    /**
     * Determine if a transaction should be retried based on the error
     */
    TransactionManager.prototype.shouldRetryTransaction = function (error) {
        var pgError = error;
        // Check for specific PostgreSQL error codes that indicate retryable errors
        if (pgError.code) {
            return [
                ERROR_CODES.DEADLOCK_DETECTED,
                ERROR_CODES.LOCK_TIMEOUT,
                ERROR_CODES.SERIALIZATION_FAILURE
            ].includes(pgError.code);
        }
        // Check error message for timeout indicators
        var message = error.message.toLowerCase();
        return message.includes('deadlock') ||
            message.includes('lock timeout') ||
            message.includes('serialization failure');
    };
    /**
     * Wait with exponential backoff
     */
    TransactionManager.prototype.wait = function (attempt) {
        return __awaiter(this, void 0, void 0, function () {
            var delay;
            return __generator(this, function (_a) {
                delay = Math.min(100 * Math.pow(2, attempt), 2000);
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
            });
        });
    };
    return TransactionManager;
}());
exports.TransactionManager = TransactionManager;
