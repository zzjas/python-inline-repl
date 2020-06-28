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
exports.registerInlineRepl = void 0;
const vscode = require("vscode");
const python_shell_1 = require("python-shell");
const child_process_1 = require("child_process");
function reportError(msg) {
    return (err) => {
        console.error(`${msg}: ${err}`);
    };
}
function registerInlineRepl(context) {
    const pythonReplLine = /^(\s*#{1,}\s+)?>>>(.*)$/;
    const pythonSelector = [{ language: 'python', scheme: 'file' }];
    const availableRepl = new WeakMap();
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
        // commands.push(headerRes[2])
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
    function generateReplacement(response, outputRange, prefix) {
        response = response.slice();
        if (response[0] == '')
            response.shift();
        if (response[response.length - 1] == '')
            response.pop();
        const filtRsponse = response.map(s => prefix + (s == '' ? '<BLANKLINE>' : s));
        const end = outputRange.isEmpty ? '\n' : '';
        return filtRsponse.map(s => s + '\n').join('') + prefix.replace(/\s+$/, '') + end;
    }
    function inlineReplRun(textEditor, edit, arg) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!arg)
                return;
            const { headerLineNum, isRunning } = arg;
            if (isRunning.flag)
                return;
            isRunning.flag = true;
            const [, res] = parseReplBlockAt(textEditor.document, headerLineNum);
            if (!res)
                return;
            const { outputRange, commands, prefix } = res;
            const pythonPath = python_shell_1.PythonShell.defaultPythonPath;
            const filePath = textEditor.document.isUntitled ? "" : textEditor.document.fileName;
            console.debug("Running " + filePath + " in PythonShell");
            console.debug("Command is: " + commands[0]);
            console.debug("PythonPath is: " + pythonPath);
            const scriptExecution = child_process_1.spawn(pythonPath, ["-i", filePath]);
            scriptExecution.stdout.on('data', (data) => __awaiter(this, void 0, void 0, function* () {
                const s = String.fromCharCode.apply(null, data);
                console.debug("From data: " + s);
                const response = s.split('\n');
                const replacement = generateReplacement(response, outputRange, prefix);
                yield textEditor.edit(e => e.replace(outputRange, replacement));
                scriptExecution.stdin.write('quit()\n');
                isRunning.flag = false;
            }));
            scriptExecution.on("close", code => {
                console.debug("python closed");
            });
            scriptExecution.stdin.write(commands[0].trim() + '\n');
        });
    }
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('python-inline-repl.inline-repl-run', (textEditor, edit, arg) => {
        inlineReplRun(textEditor, edit, arg)
            .catch(reportError('Error running inline repl'));
    }));
    function provideCodeLenses(document) {
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
                        command: 'python-inline-repl.inline-repl-run',
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
            availableRepl.set(document, available);
            return codeLenses;
        });
    }
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(pythonSelector, { provideCodeLenses }));
}
exports.registerInlineRepl = registerInlineRepl;
//# sourceMappingURL=repl.js.map