"use strict";
/*
 * Seed Database Helper
 *
 * Inserts a dummy user with ID 1 if not already present.
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
exports.seedDummyUser = seedDummyUser;
exports.seedDefaultUsers = seedDefaultUsers;
exports.seedDefaultFeedConfigs = seedDefaultFeedConfigs;
function seedDummyUser(pool) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 5, 6]);
                    // Insert a new dummy user with ID 1
                    return [4 /*yield*/, client.query("\n      INSERT INTO users (id, google_id, email, display_name, avatar_url, created_at, updated_at) OVERRIDING SYSTEM VALUE\n      VALUES (1, 'dummy_google_id', 'dummy@example.com', 'Dummy User', 'https://example.com/dummy.jpg', NOW(), NOW())\n      ON CONFLICT (id) DO UPDATE SET \n        google_id = EXCLUDED.google_id,\n        email = EXCLUDED.email,\n        display_name = EXCLUDED.display_name,\n        avatar_url = EXCLUDED.avatar_url,\n        updated_at = NOW()\n    ")];
                case 3:
                    // Insert a new dummy user with ID 1
                    _a.sent();
                    // Reset the user sequence so new users will be assigned IDs starting from 2
                    return [4 /*yield*/, client.query("ALTER SEQUENCE users_id_seq RESTART WITH 2;")];
                case 4:
                    // Reset the user sequence so new users will be assigned IDs starting from 2
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    client.release();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function seedDefaultUsers(pool) {
    return __awaiter(this, void 0, void 0, function () {
        var client, dummyUsers, _i, dummyUsers_1, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 8, 9]);
                    dummyUsers = [
                        { id: 1, google_id: 'dummy_google_id_1', email: 'dummy1@example.com', display_name: 'Dummy User 1', avatar_url: 'https://example.com/dummy1.jpg' },
                        { id: 2, google_id: 'dummy_google_id_2', email: 'dummy2@example.com', display_name: 'Dummy User 2', avatar_url: 'https://example.com/dummy2.jpg' },
                        { id: 3, google_id: 'dummy_google_id_3', email: 'dummy3@example.com', display_name: 'Dummy User 3', avatar_url: 'https://example.com/dummy3.jpg' },
                        { id: 4, google_id: 'dummy_google_id_4', email: 'dummy4@example.com', display_name: 'Dummy User 4', avatar_url: 'https://example.com/dummy4.jpg' }
                    ];
                    _i = 0, dummyUsers_1 = dummyUsers;
                    _a.label = 3;
                case 3:
                    if (!(_i < dummyUsers_1.length)) return [3 /*break*/, 6];
                    user = dummyUsers_1[_i];
                    return [4 /*yield*/, client.query("\n        INSERT INTO users (id, google_id, email, display_name, avatar_url, created_at, updated_at) OVERRIDING SYSTEM VALUE\n        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n        ON CONFLICT (id) DO UPDATE SET \n          google_id = EXCLUDED.google_id,\n          email = EXCLUDED.email,\n          display_name = EXCLUDED.display_name,\n          avatar_url = EXCLUDED.avatar_url,\n          updated_at = NOW()\n      ", [user.id, user.google_id, user.email, user.display_name, user.avatar_url])];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: 
                // Reset the user sequence so that new users start from 5
                return [4 /*yield*/, client.query("ALTER SEQUENCE users_id_seq RESTART WITH 5;")];
                case 7:
                    // Reset the user sequence so that new users start from 5
                    _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    client.release();
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function seedDefaultFeedConfigs(pool) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, client.query("\n      INSERT INTO feed_configs (id, user_id, feed_url, title, error_count, created_at, updated_at)\n      OVERRIDING SYSTEM VALUE\n      VALUES (1, 1, 'https://example.com/feed', 'Default Feed', 0, NOW(), NOW())\n      ON CONFLICT (id) DO UPDATE SET feed_url = EXCLUDED.feed_url, title = EXCLUDED.title, updated_at = NOW()\n    ")];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    client.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
