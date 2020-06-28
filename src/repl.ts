import * as vscode from 'vscode';

function reportError( msg: string) {
    return (err : string) => {
        console.error(`${msg}: ${err}`);
    }
}

export function registerInlineRepl(context: vscode.ExtensionContext) {
    const pythonReplLine = /^(\s*#{1,}\s+)?>>>(.*)$/;
    const pythonSelector: vscode.DocumentSelector = [{ language: 'python', scheme: 'file' }];
    const availableRepl: WeakMap<vscode.TextDocument, [vscode.Range, vscode.Command][]> = new WeakMap();

    function parseReplBlockAt(
        document: vscode.TextDocument, lineNum: number):
        [number, null | {
            headerRange: vscode.Range,
            outputRange: vscode.Range,
            commands: string[],
            prefix: string
        }] {
        const { lineCount } = document;
        const headerLine = document.lineAt(lineNum);
        const header = headerLine.text.replace(/\s+$/, '');
        const headerRes = pythonReplLine.exec(header);
        if(headerRes == null) {
            return [ lineNum + 1, null ];
        }

        const headerLineNum = lineNum;
        const prefix = headerRes[1] || '';
        const commands = [];
        // commands.push(headerRes[2])
        for (; lineNum < lineCount; lineNum ++) {
            const line = document.lineAt(lineNum).text.replace(/\s+$/, '');
            const lineRes = pythonReplLine.exec(line);
            if (line.startsWith(prefix) && lineRes !== null) {
                commands.push(lineRes[2])
            } else {
                break;
            }
        }

        const outputLineNum = lineNum;

        for (; lineNum < lineCount; lineNum ++) {
            const line = document.lineAt(lineNum).text.replace(/\s+$/, '');

            if (line == prefix.replace(/\s+$/, '')) {
                lineNum ++;
                break;
            }
            if (pythonReplLine.test(line) || ! line.startsWith(prefix))
                break;
        }

        const endLineNum = lineNum;

        const headerRange = new vscode.Range(
            document.lineAt(headerLineNum).range.start,
            document.lineAt(outputLineNum - 1).range.end);

        const outputRange = new vscode.Range(
            document.lineAt(outputLineNum).range.start,
            outputLineNum == endLineNum
                ? document.lineAt(outputLineNum).range.start
                : document.lineAt(endLineNum - 1).range.end);

        return [ lineNum, { headerRange, outputRange, commands, prefix } ];
        // return [0, null];
    }

    function generateReplacement(
        response: string[],
        outputRange: vscode.Range,
        prefix: string
    ): string {
        response = response.slice();
        if (response[0] == '') response.shift();
        if (response[response.length - 1] == '') response.pop();
        const filtRsponse = response.map(s => prefix + (s == '' ? '<BLANKLINE>' : s));
        const end = outputRange.isEmpty ? '\n' : '';
        return filtRsponse.map(s => s + '\n').join('') + prefix.replace(/\s+$/, '') + end;
    }

    async function inlineReplRun (
        textEditor: vscode.TextEditor,
        edit: vscode.TextEditorEdit,
        arg?: {
            headerLineNum: number
            isRunning: { flag: boolean },
        }): Promise<void> {
        if(!arg) return;
        const { headerLineNum, isRunning } = arg;
        if(isRunning.flag) return;
        isRunning.flag = true;
        const [ , res ] = parseReplBlockAt(textEditor.document, headerLineNum);
        if(!res) return;
        const { outputRange, commands, prefix } = res;

        const response = ["Response from running: " + commands];
        await printReplacement(textEditor, response, outputRange, prefix);
        isRunning.flag = false;

    }

    async function printReplacement(
        textEditor : vscode.TextEditor,
        response : string[],
        outputRange : vscode.Range,
        prefix : string) {
        const replacement = generateReplacement(response, outputRange, prefix);
        await textEditor.edit(e => e.replace(outputRange, replacement));
    }

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(
            'python-inline-repl.inline-repl-run',
            (textEditor, edit, arg) => {
                inlineReplRun(textEditor, edit, arg)
                    .catch(reportError('Error running inline repl'));
            }
        )
    );

    async function provideCodeLenses(
        document: vscode.TextDocument):
        Promise<vscode.CodeLens[]> {

        const codeLenses: vscode.CodeLens[] = [];
        const available: [vscode.Range, vscode.Command][] = [];
        const lineCount = document.lineCount;
        for (let lineNum = 0; lineNum < lineCount;) {
            const [ lineNum1, res ] = parseReplBlockAt(document, lineNum);
            lineNum = lineNum1;
            if (res !== null) {
                const { headerRange } = res;
                const command: vscode.Command = {
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
                codeLenses.push(
                    new vscode.CodeLens(
                        document.lineAt(headerRange.start.line).range, command));
            }
        }
        availableRepl.set(document, available);
        return codeLenses;
    }

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            pythonSelector,
            { provideCodeLenses }
        )
    );
}







