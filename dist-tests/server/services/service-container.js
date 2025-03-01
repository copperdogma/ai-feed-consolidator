"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceContainer = void 0;
exports.getServiceContainer = getServiceContainer;
exports.initializeServiceContainer = initializeServiceContainer;
var feed_item_1 = require("./feed-item");
var google_auth_service_1 = require("./google-auth-service");
var login_history_1 = require("./login-history");
var user_service_1 = require("./user-service");
var user_preferences_service_1 = require("./user-preferences-service");
var rss_service_1 = require("./rss/rss-service");
var openai_1 = require("./openai");
var opml_1 = require("./opml");
var feed_config_1 = require("./feed-config");
var feed_health_1 = require("./feed-health");
var transaction_manager_1 = require("./transaction-manager");
var feed_repository_1 = require("./rss/feed-repository");
var rss_fetcher_1 = require("./rss/rss-fetcher");
var rss_parser_1 = require("./rss/rss-parser");
var logger_1 = require("../logger");
var ServiceContainer = /** @class */ (function () {
    function ServiceContainer(pool) {
        this.pool = pool;
        this.services = new Map();
        this.factories = new Map();
        this.staticServices = new Set();
        // Register services that take a Pool
        this.registerPoolService('loginHistoryService', login_history_1.LoginHistoryService);
        // Register services that take a Container
        this.registerContainerService('feedItemService', feed_item_1.FeedItemService);
        this.registerContainerService('googleAuthService', google_auth_service_1.GoogleAuthService);
        this.registerContainerService('userService', user_service_1.UserService);
        this.registerContainerService('userPreferencesService', user_preferences_service_1.UserPreferencesService);
        this.registerContainerService('openAIService', openai_1.OpenAIService);
        this.registerContainerService('feedConfigService', feed_config_1.FeedConfigService);
        this.registerContainerService('feedHealthService', feed_health_1.FeedHealthService);
        this.registerContainerService('feedRepository', feed_repository_1.FeedRepository);
        this.registerContainerService('transactionManager', transaction_manager_1.TransactionManager);
        // Register services with custom factory functions
        this.registerFactory('rssService', function (container) {
            return new rss_service_1.RSSService(container);
        });
        this.registerFactory('opmlService', function (container) {
            return new opml_1.OPMLService(container);
        });
        this.registerFactory('rssFetcher', function () { return new rss_fetcher_1.RSSFetcher(); });
        this.registerFactory('rssParser', function () { return new rss_parser_1.RSSParser(); });
    }
    // Register a service that takes a Pool
    ServiceContainer.prototype.registerPoolService = function (name, ServiceClass) {
        this.factories.set(name, function (container) { return new ServiceClass(container.getPool()); });
    };
    // Register a service that takes a Container
    ServiceContainer.prototype.registerContainerService = function (name, ServiceClass) {
        this.factories.set(name, function (container) { return new ServiceClass(container); });
    };
    // Register a service with its constructor
    ServiceContainer.prototype.isServiceWithContainer = function (constructor) {
        // Check if the constructor parameter is named 'container'
        var params = constructor.toString().match(/constructor\s*\(\s*([^)]*)\)/);
        if (params && params[1]) {
            return params[1].trim().startsWith('container');
        }
        return false;
    };
    ServiceContainer.prototype.registerService = function (name, ServiceClass) {
        var _this = this;
        this.factories.set(name, function (container) {
            if (_this.isServiceWithContainer(ServiceClass)) {
                return new ServiceClass(container);
            }
            else {
                return new ServiceClass(_this.pool);
            }
        });
    };
    // Register a static service
    ServiceContainer.prototype.registerStaticService = function (StaticClass) {
        StaticClass.setPool(this.pool);
        this.staticServices.add(StaticClass);
    };
    // Register a service with a custom factory function
    ServiceContainer.prototype.registerFactory = function (name, factory) {
        this.factories.set(name, factory);
    };
    // Get a service instance, creating it if it doesn't exist
    ServiceContainer.prototype.getService = function (name) {
        if (this.services.has(name)) {
            return this.services.get(name);
        }
        var factory = this.factories.get(name);
        if (!factory) {
            throw new Error("Service '".concat(name, "' not registered"));
        }
        try {
            var service = factory(this);
            this.services.set(name, service);
            return service;
        }
        catch (error) {
            logger_1.logger.error({ error: error, serviceName: name }, 'Failed to create service');
            throw error;
        }
    };
    // Clear all service instances
    ServiceContainer.prototype.clear = function () {
        this.services.clear();
    };
    // Get the database pool instance
    ServiceContainer.prototype.getPool = function () {
        return this.pool;
    };
    return ServiceContainer;
}());
exports.ServiceContainer = ServiceContainer;
// Export a singleton instance of the service container
var defaultContainer = null;
function getServiceContainer() {
    if (!defaultContainer) {
        throw new Error('Service container not initialized');
    }
    return defaultContainer;
}
function initializeServiceContainer(pool) {
    if (!defaultContainer) {
        defaultContainer = new ServiceContainer(pool);
    }
    return defaultContainer;
}
