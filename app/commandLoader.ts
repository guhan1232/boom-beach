/// <reference path="../typings/index.d.ts" />

import { CommandBase } from "./commandBase";
import * as glob from "glob";
import * as path from "path";

let rootDir = path.dirname(require.main.filename);

var commands: { [key: string]: CommandBase; } = {};

let files = glob.sync("./commands/*.js", { cwd: rootDir });
files.forEach(path => {
	let plugin = require(path).default();
	commands[plugin.command] = plugin;
});

export default commands;