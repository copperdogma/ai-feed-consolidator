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
exports.getPool = getPool;
exports.getClient = getClient;
exports.withClient = withClient;
exports.withTransaction = withTransaction;
exports.query = query;
exports.queryOne = queryOne;
exports.queryCount = queryCount;
exports.execute = execute;
exports.exists = exists;
exports.getCurrentTimestamp = getCurrentTimestamp;
exports.checkHealth = checkHealth;
exports.createUser = createUser;
exports.getUserByGoogleId = getUserByGoogleId;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.getUserPreferences = getUserPreferences;
exports.updateUserPreferences = updateUserPreferences;
exports.initializeDatabase = initializeDatabase;
var logger_1 = require("../logger");
var service_container_1 = require("./service-container");
// Get the database pool from the service container
function getPool() {
    return (0, service_container_1.getServiceContainer)().getPool();
}
// Helper function to get a client from the pool
function getClient() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            pool = getPool();
            return [2 /*return*/, pool.connect()];
        });
    });
}
// Helper function to execute a query with a client
function withClient(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getClient()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, callback(client)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    client.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Helper function to execute a query within a transaction
function withTransaction(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var client, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getClient()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, 8, 9]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, callback(client)];
                case 4:
                    result = _a.sent();
                    return [4 /*yield*/, client.query('COMMIT')];
                case 5:
                    _a.sent();
                    return [2 /*return*/, result];
                case 6:
                    error_1 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 7:
                    _a.sent();
                    throw error_1;
                case 8:
                    client.release();
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Helper function to execute a query with automatic client handling
function query(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            return [2 /*return*/, withClient(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.query(sql, params)];
                            case 1:
                                result = _a.sent();
                                return [2 /*return*/, result.rows];
                        }
                    });
                }); })];
        });
    });
}
// Helper function to execute a query and return a single row
function queryOne(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var rows;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, query(sql, params)];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, rows[0] || null];
            }
        });
    });
}
// Helper function to execute a query and return the count
function queryCount(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var result;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryOne(sql, params)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result ? parseInt(result.count, 10) : 0];
            }
        });
    });
}
// Helper function to execute a query and return the affected row count
function execute(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            return [2 /*return*/, withClient(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.query(sql, params)];
                            case 1:
                                result = _a.sent();
                                return [2 /*return*/, result.rowCount];
                        }
                    });
                }); })];
        });
    });
}
// Helper function to check if a row exists
function exists(sql_1) {
    return __awaiter(this, arguments, void 0, function (sql, params) {
        var count;
        if (params === void 0) { params = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryCount(sql, params)];
                case 1:
                    count = _a.sent();
                    return [2 /*return*/, count > 0];
            }
        });
    });
}
// Helper function to get the current timestamp
function getCurrentTimestamp() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryOne('SELECT NOW() as now')];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.now];
            }
        });
    });
}
// Helper function to check database health
function checkHealth() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, query('SELECT 1')];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_2 = _a.sent();
                    logger_1.logger.error({ error: error_2 }, 'Database health check failed');
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createUser(data) {
    return __awaiter(this, void 0, void 0, function () {
        var client, userResult, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getClient()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, 9, 10]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.query("INSERT INTO users (google_id, email, display_name, avatar_url, created_at, updated_at)\n       VALUES ($1, $2, $3, $4, NOW(), NOW())\n       RETURNING *", [data.google_id, data.email, data.display_name, data.avatar_url])];
                case 4:
                    userResult = _a.sent();
                    // Create default preferences
                    return [4 /*yield*/, client.query("INSERT INTO user_preferences (user_id, theme, created_at, updated_at)\n       VALUES ($1, 'light', NOW(), NOW())", [userResult.rows[0].id])];
                case 5:
                    // Create default preferences
                    _a.sent();
                    return [4 /*yield*/, client.query('COMMIT')];
                case 6:
                    _a.sent();
                    return [2 /*return*/, userResult.rows[0]];
                case 7:
                    error_3 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 8:
                    _a.sent();
                    throw error_3;
                case 9:
                    client.release();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function getUserByGoogleId(googleId) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.query('SELECT * FROM users WHERE google_id = $1', [googleId])];
                            case 1:
                                result = _a.sent();
                                return [2 /*return*/, result.rows[0] || null];
                        }
                    });
                }); })];
        });
    });
}
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.query('SELECT * FROM users WHERE id = $1', [id])];
                            case 1:
                                result = _a.sent();
                                return [2 /*return*/, result.rows[0] || null];
                        }
                    });
                }); })];
        });
    });
}
function updateUser(id, data) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var updates, values, paramCount, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                updates = [];
                                values = [];
                                paramCount = 1;
                                if (data.display_name !== undefined) {
                                    updates.push("display_name = $".concat(paramCount));
                                    values.push(data.display_name);
                                    paramCount++;
                                }
                                if (data.email !== undefined) {
                                    updates.push("email = $".concat(paramCount));
                                    values.push(data.email);
                                    paramCount++;
                                }
                                if (data.avatar_url !== undefined) {
                                    updates.push("avatar_url = $".concat(paramCount));
                                    values.push(data.avatar_url);
                                    paramCount++;
                                }
                                if (updates.length === 0) {
                                    return [2 /*return*/, null];
                                }
                                values.push(id);
                                return [4 /*yield*/, client.query("UPDATE users \n       SET ".concat(updates.join(', '), ", updated_at = NOW()\n       WHERE id = $").concat(paramCount, "\n       RETURNING *"), values)];
                            case 1:
                                result = _a.sent();
                                return [2 /*return*/, result.rows[0] || null];
                        }
                    });
                }); })];
        });
    });
}
function getUserPreferences(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var result, defaultPreferences, newPrefsResult;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])];
                            case 1:
                                result = _a.sent();
                                if (!(result.rows.length === 0)) return [3 /*break*/, 3];
                                defaultPreferences = {
                                    theme: 'light',
                                    user_id: userId
                                };
                                return [4 /*yield*/, client.query("INSERT INTO user_preferences (\n          user_id, \n          theme, \n          created_at,\n          updated_at\n        )\n        VALUES ($1, $2, NOW(), NOW())\n        RETURNING *", [
                                        userId,
                                        defaultPreferences.theme
                                    ])];
                            case 2:
                                newPrefsResult = _a.sent();
                                return [2 /*return*/, newPrefsResult.rows[0] || null];
                            case 3: return [2 /*return*/, result.rows[0]];
                        }
                    });
                }); })];
        });
    });
}
function updateUserPreferences(userId, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, withTransaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                    var existing, updateFields, updateValues, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, getUserPreferences(userId)];
                            case 1:
                                existing = _a.sent();
                                if (!existing) {
                                    return [2 /*return*/, null];
                                }
                                updateFields = Object.keys(updates).map(function (key, i) { return "".concat(key, " = $").concat(i + 2); });
                                updateValues = Object.values(updates);
                                updateValues.unshift(userId); // Add userId as first parameter
                                return [4 /*yield*/, client.query("UPDATE user_preferences \n       SET ".concat(updateFields.join(', '), ", updated_at = NOW()\n       WHERE user_id = $1\n       RETURNING *"), updateValues)];
                            case 2:
                                result = _a.sent();
                                return [2 /*return*/, result.rows[0] || null];
                        }
                    });
                }); })];
        });
    });
}
function validateSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var requiredColumns, _i, _a, _b, table, columns, rows, existingColumns, _c, columns_1, col;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    requiredColumns = {
                        feed_items: ['feed_config_id'],
                        feed_configs: ['user_id', 'feed_url']
                    };
                    _i = 0, _a = Object.entries(requiredColumns);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    _b = _a[_i], table = _b[0], columns = _b[1];
                    return [4 /*yield*/, getPool().query("\n      SELECT column_name \n      FROM information_schema.columns \n      WHERE table_name = $1\n    ", [table])];
                case 2:
                    rows = (_d.sent()).rows;
                    existingColumns = rows.map(function (r) { return r.column_name; });
                    for (_c = 0, columns_1 = columns; _c < columns_1.length; _c++) {
                        col = columns_1[_c];
                        if (!existingColumns.includes(col)) {
                            throw new Error("Missing required column ".concat(col, " in table ").concat(table));
                        }
                    }
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var client, exec, promisify, execAsync, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getClient()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 9, 10]);
                    exec = require('child_process').exec;
                    promisify = require('util').promisify;
                    execAsync = promisify(exec);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 7, , 8]);
                    // Drop all tables first to ensure clean state
                    return [4 /*yield*/, client.query("\n        DO $$ DECLARE\n          r RECORD;\n        BEGIN\n          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP\n            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';\n          END LOOP;\n        END $$;\n      ")];
                case 4:
                    // Drop all tables first to ensure clean state
                    _a.sent();
                    // Run migrations
                    return [4 /*yield*/, execAsync('npx sequelize-cli db:migrate --env test')];
                case 5:
                    // Run migrations
                    _a.sent();
                    console.log('Database initialized successfully');
                    // Validate schema after migrations
                    return [4 /*yield*/, validateSchema()];
                case 6:
                    // Validate schema after migrations
                    _a.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_4 = _a.sent();
                    console.error('Failed to initialize database:', error_4);
                    throw error_4;
                case 8: return [3 /*break*/, 10];
                case 9:
                    client.release();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Call during service initialization, but don't exit in test environment
if (process.env.NODE_ENV !== 'test') {
    validateSchema().catch(function (err) {
        console.error('Schema validation failed:', err);
        process.exit(1);
    });
}
