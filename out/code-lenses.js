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
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function codeLenses(document) {
    return __awaiter(this, void 0, void 0, function* () {
        const codeLenses = [];
        const available = [];
        const lineCount = document.lineCount;
        for (let lineNum = 0; lineNum < lineCount;) {
            const [lineNum1, res] = parseReplBlockAt(document, lineNum);
            lineNum = lineNum1;
            if (res !== null) {
                const { headerRange } = res;
                const command = {
                    title: 'Run in Python',
                    command: ' python-inline-repl.helloWorld',
                    arguments: [
                        {
                            headerLineNum: headerRange.start.line,
                            isRunning: { flag: false }
                        }
                    ]
                };
                available.push([headerRange, command]);
                codeLenses.push(new vscode.CodeLens(document.lineAt(headerRange.start.line).range, command));
            }
        }
        // availableRepl.set(document, available);
        return codeLenses;
    });
}
//# sourceMappingURL=code-lenses.js.map