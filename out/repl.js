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
exports.provideCodeLenses = void 0;
const vscode = require("vscode");
const pythonReplLine = /^(\s*#{2,}\s+)?>>>(.*)$/;
function provideCodeLenses(document) {
    return __awaiter(this, void 0, void 0, function* () {
        const codeLenses = [];
        const available = [];
        const lineCount = document.lineCount;
        for (let lineNum = 0; lineNum < lineCount;) {
            vscode.window.showInformationMessage("Reading line : " + document.lineAt(lineNum).text);
            const [lineNum1, res] = parseReplBlockAt(document, lineNum);
            lineNum = lineNum1;
            if (res !== null) {
                vscode.window.showInformationMessage("Read line with comment: " + document.lineAt(lineNum).text);
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
exports.provideCodeLenses = provideCodeLenses;
function parseReplBlockAt(document, lineNum) {
    const { lineCount } = document;
    const headerLine = document.lineAt(lineNum);
    const header = headerLine.text.replace(/\s+$/, '');
    const headerRes = pythonReplLine.exec(header);
    if (headerRes == null) {
        return [lineNum + 1, null];
    }
    const headerLineNum = lineNum;
    const prefix = headerRes[1] || '';
    const commands = [];
    commands.push(headerRes[2]);
    for (; lineNum < lineCount; lineNum++) {
        const line = document.lineAt(lineNum).text.replace(/\s+$/, '');
        const lineRes = pythonReplLine.exec(line);
        if (line.startsWith(prefix) && lineRes !== null) {
            commands.push(lineRes[2]);
        }
        else {
            break;
        }
    }
    const outputLineNum = lineNum;
    for (; lineNum < lineCount; lineNum++) {
        const line = document.lineAt(lineNum).text.replace(/\s+$/, '');
        if (line == prefix.replace(/\s+$/, '')) {
            lineNum++;
            break;
        }
        if (pythonReplLine.test(line) || !line.startsWith(prefix))
            break;
    }
    const endLineNum = lineNum;
    const headerRange = new vscode.Range(document.lineAt(headerLineNum).range.start, document.lineAt(outputLineNum - 1).range.end);
    const outputRange = new vscode.Range(document.lineAt(outputLineNum).range.start, outputLineNum == endLineNum
        ? document.lineAt(outputLineNum).range.start
        : document.lineAt(endLineNum - 1).range.end);
    return [lineNum, { headerRange, outputRange, commands, prefix }];
    // return [0, null];
}
//# sourceMappingURL=repl.js.map