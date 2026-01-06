"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseBedrijf = void 0;
const app_1 = require("firebase-admin/app");
// Initialize app globally for all functions
(0, app_1.initializeApp)();
var ai_analyst_1 = require("./features/ai-analyst");
Object.defineProperty(exports, "analyseBedrijf", { enumerable: true, get: function () { return ai_analyst_1.analyseBedrijf; } });
//# sourceMappingURL=index.js.map