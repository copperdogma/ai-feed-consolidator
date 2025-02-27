"use strict";
/**
 * Test Database Setup Strategy
 * ==========================
 *
 * IMPORTANT: DO NOT MODIFY THIS STRATEGY WITHOUT TEAM DISCUSSION
 *
 * The test database lifecycle follows these specific steps:
 *
 * 1. GLOBAL INITIALIZATION (Once per test run)
 *    - Handled by global-setup.ts
 *    - Database is dropped and recreated fresh
 *    - Migrations are run ONCE to create schema
 *    - Connection pool is initialized
 *
 * 2. PER-TEST CLEANUP (Between each test)
 *    - Tables are TRUNCATED (not dropped)
 *    - Foreign key constraints are preserved
 *    - Sequences are reset
 *    - Uses transactions for atomicity
 *
 * 3. DATA SETUP (Within each test)
 *    - Tests use factory functions to create data
 *    - Each test is responsible for its own test data
 *    - Data is isolated between tests via truncation
 *
 * Key Points:
 * - NEVER drop/recreate tables between tests
 * - NEVER re-run migrations between tests
 * - Use TRUNCATE for fast cleanup
 * - Maintain foreign key constraints
 * - Use factory functions for test data
 *
 * This approach ensures:
 * - Fast test execution
 * - Test isolation
 * - Data consistency
 * - Proper cleanup
 */
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
exports.dbManager = exports.DatabaseStateManager = void 0;
exports.initializeTestDatabase = initializeTestDatabase;
exports.resetTestDatabase = resetTestDatabase;
exports.closeTestDatabase = closeTestDatabase;
exports.createTestUser = createTestUser;
var pg_1 = require("pg");
var dotenv_1 = require("dotenv");
var logger_1 = require("../../server/logger");
var vitest_1 = require("vitest");
var factories_1 = require("./factories");
var seed_database_1 = require("../../server/test-helpers/seed-database");
// Load test environment variables
(0, dotenv_1.config)({ path: '.env.test' });
// Constants
var CLEANUP_LOCK_ID = 41724;
var STATEMENT_TIMEOUT = 30000; // 30 seconds
var LOCK_TIMEOUT = 10000; // 10 seconds
var MAX_RETRIES = 3;
var RETRY_DELAY = 1000; // 1 second
var cleaningMutex = Promise.resolve();
function lockCleaning() {
    var release;
    var lockPromise = new Promise(function (resolve) { release = resolve; });
    var previous = cleaningMutex;
    cleaningMutex = previous.then(function () { return lockPromise; });
    return previous.then(function () { return release; });
}
// Tables in dependency order (children first, parents last)
var TABLES_IN_ORDER = [
    'feed_items',
    'feed_health',
    'feed_configs',
    'login_history',
    'user_preferences',
    'sessions',
    'users'
];
var DatabaseStateManager = /** @class */ (function () {
    function DatabaseStateManager() {
        this.pool = null;
        this.isInitialized = false;
        this.testDataFactory = null;
    }
    DatabaseStateManager.getInstance = function () {
        if (!DatabaseStateManager.instance) {
            DatabaseStateManager.instance = new DatabaseStateManager();
        }
        return DatabaseStateManager.instance;
    };
    DatabaseStateManager.prototype.getPool = function () {
        if (!this.pool || !this.isInitialized) {
            throw new Error('Database not initialized');
        }
        return this.pool;
    };
    DatabaseStateManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var retries, client, error_1, releaseError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isInitialized) {
                            return [2 /*return*/];
                        }
                        retries = 0;
                        client = null;
                        _a.label = 1;
                    case 1:
                        if (!(retries < MAX_RETRIES)) return [3 /*break*/, 16];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, 10, 15]);
                        // Create a new pool with test-specific settings
                        this.pool = new pg_1.Pool({
                            connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-test',
                            max: 5,
                            idleTimeoutMillis: 1000,
                            connectionTimeoutMillis: 5000,
                            application_name: 'test_runner'
                        });
                        return [4 /*yield*/, this.pool.connect()];
                    case 3:
                        // Test the connection and set up initial state
                        client = _a.sent();
                        // Initialize TestDataFactory
                        this.testDataFactory = factories_1.TestDataFactory.getInstance();
                        this.testDataFactory.setPool(this.pool);
                        return [4 /*yield*/, this.testDataFactory.initialize()];
                    case 4:
                        _a.sent();
                        // Verify we can execute queries
                        return [4 /*yield*/, client.query('SELECT 1')];
                    case 5:
                        // Verify we can execute queries
                        _a.sent();
                        this.isInitialized = true;
                        logger_1.logger.info('Test database initialized successfully');
                        return [2 /*return*/];
                    case 6:
                        error_1 = _a.sent();
                        retries++;
                        logger_1.logger.error("Failed to initialize test database (attempt ".concat(retries, "/").concat(MAX_RETRIES, "):"), error_1);
                        if (!this.pool) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.pool.end().catch(function (err) {
                                return logger_1.logger.error('Error closing pool during retry:', err);
                            })];
                    case 7:
                        _a.sent();
                        this.pool = null;
                        _a.label = 8;
                    case 8:
                        if (retries === MAX_RETRIES) {
                            throw error_1;
                        }
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, RETRY_DELAY); })];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 15];
                    case 10:
                        if (!client) return [3 /*break*/, 14];
                        _a.label = 11;
                    case 11:
                        _a.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, client.release()];
                    case 12:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        releaseError_1 = _a.sent();
                        logger_1.logger.error('Error releasing client:', releaseError_1);
                        return [3 /*break*/, 14];
                    case 14: return [7 /*endfinally*/];
                    case 15: return [3 /*break*/, 1];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStateManager.prototype.cleanDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var release, client, seedTables_1, tablesToTruncate, _i, tablesToTruncate_1, table, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pool || !this.isInitialized) {
                            throw new Error('Database not initialized');
                        }
                        return [4 /*yield*/, lockCleaning()];
                    case 1:
                        release = _a.sent();
                        client = null;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, 13, 14]);
                        return [4 /*yield*/, this.pool.connect()];
                    case 3:
                        client = _a.sent();
                        seedTables_1 = ['feed_configs'];
                        tablesToTruncate = TABLES_IN_ORDER.filter(function (t) { return !seedTables_1.includes(t); });
                        // Truncate tables and reset identities
                        return [4 /*yield*/, client.query("BEGIN")];
                    case 4:
                        // Truncate tables and reset identities
                        _a.sent();
                        _i = 0, tablesToTruncate_1 = tablesToTruncate;
                        _a.label = 5;
                    case 5:
                        if (!(_i < tablesToTruncate_1.length)) return [3 /*break*/, 8];
                        table = tablesToTruncate_1[_i];
                        return [4 /*yield*/, client.query("TRUNCATE TABLE \"".concat(table, "\" RESTART IDENTITY CASCADE;"))];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8: return [4 /*yield*/, client.query("COMMIT")];
                    case 9:
                        _a.sent();
                        // Seed default users and default feed configurations
                        return [4 /*yield*/, (0, seed_database_1.seedDefaultUsers)(this.pool)];
                    case 10:
                        // Seed default users and default feed configurations
                        _a.sent();
                        return [4 /*yield*/, (0, seed_database_1.seedDefaultFeedConfigs)(this.pool)];
                    case 11:
                        _a.sent();
                        logger_1.logger.info('Database cleaned up successfully');
                        return [3 /*break*/, 14];
                    case 12:
                        error_2 = _a.sent();
                        throw error_2;
                    case 13:
                        client === null || client === void 0 ? void 0 : client.release();
                        release();
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStateManager.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pool) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.pool.end()];
                    case 1:
                        _a.sent();
                        this.pool = null;
                        _a.label = 2;
                    case 2:
                        this.isInitialized = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStateManager.instance = null;
    return DatabaseStateManager;
}());
exports.DatabaseStateManager = DatabaseStateManager;
// Export singleton instance
exports.dbManager = DatabaseStateManager.getInstance();
// Initialize database before tests
(0, vitest_1.beforeAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
    var retries, maxRetries, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                retries = 0;
                maxRetries = 3;
                _a.label = 1;
            case 1:
                if (!(retries < maxRetries)) return [3 /*break*/, 7];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 6]);
                logger_1.logger.info('Initializing test database...');
                return [4 /*yield*/, exports.dbManager.initialize()];
            case 3:
                _a.sent();
                logger_1.logger.info('Test database initialized successfully');
                return [2 /*return*/];
            case 4:
                error_3 = _a.sent();
                retries++;
                logger_1.logger.error("Failed to initialize test database (attempt ".concat(retries, "/").concat(maxRetries, "):"), error_3);
                if (retries === maxRetries) {
                    logger_1.logger.error('Max retries reached, failing test initialization');
                    throw error_3;
                }
                // Wait before retrying
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
            case 5:
                // Wait before retrying
                _a.sent();
                return [3 /*break*/, 6];
            case 6: return [3 /*break*/, 1];
            case 7: return [2 /*return*/];
        }
    });
}); }, 30000); // 30 second timeout
// Clean up after each test
(0, vitest_1.afterEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.dbManager.cleanDatabase()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
// Close pool after all tests
(0, vitest_1.afterAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.dbManager.close()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function initializeTestDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.dbManager.getPool()];
        });
    });
}
function resetTestDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.dbManager.cleanDatabase()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function closeTestDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.dbManager.close()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Export helper function to create test user
function createTestUser(pool) {
    return __awaiter(this, void 0, void 0, function () {
        var client, uniqueId, userResult, userId, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, 9, 10]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    uniqueId = Math.random().toString(36).substring(2, 15);
                    return [4 /*yield*/, client.query("\n      INSERT INTO users (email, password_hash, created_at, updated_at)\n      VALUES ($1, $2, NOW(), NOW())\n      RETURNING id\n    ", ["test-".concat(uniqueId, "@example.com"), 'test-hash'])];
                case 4:
                    userResult = _a.sent();
                    userId = userResult.rows[0].id;
                    // Create user preferences
                    return [4 /*yield*/, client.query("\n      INSERT INTO user_preferences (\n        user_id,\n        theme,\n        email_notifications,\n        content_language,\n        summary_level,\n        created_at,\n        updated_at\n      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n    ", [userId, 'light', true, 'en', 1])];
                case 5:
                    // Create user preferences
                    _a.sent();
                    return [4 /*yield*/, client.query('COMMIT')];
                case 6:
                    _a.sent();
                    return [2 /*return*/, userId];
                case 7:
                    error_4 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 8:
                    _a.sent();
                    throw error_4;
                case 9:
                    client.release();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
