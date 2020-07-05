//	Imports ____________________________________________________________________

import * as vscode from 'vscode';

import { ExtensionManager } from '../services/ExtensionManager';

//	Variables __________________________________________________________________

let timeoutId:NodeJS.Timeout|null = null;

//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function activate (context:vscode.ExtensionContext) {
	
	context.subscriptions.push(vscode.commands.registerCommand('l13BuiltInExtensions.clone', async () => {
		
		ExtensionManager.clone(context);
		
	}));
	
	timeoutId = setTimeout(() => { // Give VS Code time to load and uninstall extensions
		
		timeoutId = null;
		ExtensionManager.detectUpdate(context);
		
	}, 5000);
	
	ExtensionManager.detectEnabledBuiltInExtensions(context);
	
	vscode.extensions.onDidChange(() => ExtensionManager.detectEnabledBuiltInExtensions(context));
	
}

export function deactivate () { // Clear timeout if VS Code will be closed or reloaded in 5 secconds.
	
	if (timeoutId) clearTimeout(timeoutId);
	
}

//	Functions __________________________________________________________________

