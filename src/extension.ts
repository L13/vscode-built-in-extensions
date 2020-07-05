//	Imports ____________________________________________________________________

import * as vscode from 'vscode';

import * as manage from './commands/manage';

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function activate (context:vscode.ExtensionContext) {
	
	manage.activate(context);

}

export function deactivate () {
	
	manage.deactivate();
	
}


//	Functions __________________________________________________________________

