"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as vscode from 'vscode';
const python_shell_1 = require("python-shell");
// let options = {
//     mode: 'text',
//     pythonPath: 'path/to/python',
//     pythonOptions: ['-u'], // get print results in real-time
//     scriptPath: 'path/to/my/scripts',
//     args: ['value1', 'value2', 'value3']
//   };
python_shell_1.PythonShell.run('my_script.py', undefined, function (err, results) {
    if (err)
        throw err;
    // results is an array consisting of messages collected during execution
    console.log('results: %j', results);
});
//# sourceMappingURL=py.js.map