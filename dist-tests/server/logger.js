"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var pino_1 = require("pino");
// Initialize shared logger
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                level: 'info',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            },
            {
                target: 'pino/file',
                level: 'info',
                options: {
                    destination: './logs/app.log',
                    mkdir: true
                }
            }
        ]
    }
});
