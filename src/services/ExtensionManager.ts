//	Imports ____________________________________________________________________

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { copyFile, walkTree } from '../@l13/fse';
import { Feature, StatsMap } from '../types';

//	Variables __________________________________________________________________

const BUTTON_UPDATE_DONT_ASK_AGAIN = `Update, don't show again`;

const features:Feature[] = [
	{ label: 'Breakpoints', name: 'breakpoints', picked: true },
	{ label: 'Colors', name: 'colors', picked: true },
	{ label: 'Debuggers', name: 'debuggers', picked: true },
	{ label: 'Grammars', name: 'grammars', picked: true },
	{ label: 'Icon Themes', name: 'iconThemes', picked: true },
	{ label: 'JSON Validation', name: 'jsonValidation', picked: true },
	{ label: 'Keybindings', name: 'keybindings', picked: true },
	{ label: 'Languages', name: 'languages', picked: true },
	{ label: 'Menus', name: 'menus', picked: true },
	{ label: 'Problem Matchers', name: 'problemMatchers', picked: true },
	{ label: 'Problem Patterns', name: 'problemPatterns', picked: true },
	{ label: 'Product Icon Themes', name: 'productIconThemes', picked: true },
	{ label: 'Resource Label Formatters', name: 'resourceLabelFormatters', picked: true },
	{ label: 'Snippets', name: 'snippets', picked: false },
	{ label: 'Task Definitions', name: 'taskDefinitions', picked: true },
	{ label: 'Themes', name: 'themes', picked: true },
	{ label: 'Typescript Server Plugins', name: 'typescriptServerPlugins', picked: true },
	{ label: 'Views', name: 'views', picked: true },
	{ label: 'Views Containers', name: 'viewsContainers', picked: true },
];

//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export class ExtensionManager {
	
	public static async detectEnabledBuiltInExtensions (context:vscode.ExtensionContext) {
		
		const modifiedExtensions:vscode.Extension<any>[] = [];
		const builtinExtensions:vscode.Extension<any>[] = [];
		const activeExtensions:vscode.Extension<any>[] = [];
		
		vscode.extensions.all.forEach((extension) => {
			
			if (extension.packageJSON.publisher === 'vscode') {
				if (extension.packageJSON._origin) modifiedExtensions.push(extension);
				else builtinExtensions.push(extension);
			}
			
		});
		
		modifiedExtensions.filter((modified) => {
			
			const origin = modified.packageJSON._origin;
			const exists = builtinExtensions.some((builtin) => builtin.extensionPath === origin ? !!activeExtensions.push(builtin): false);
			
			if (!exists && !fs.existsSync(origin)) vscode.window.showErrorMessage(`The built-in extension for "${modified.packageJSON.displayName}" does not exist anymore!`);
			
		});
		
		if (activeExtensions.length) {
			activeExtensions.forEach(async (extension) => {
				
				const text = `Please disable the built-in extension "${extension.packageJSON.displayName}" or uninstall the modfied version.`;
				const show = await vscode.window.showWarningMessage(text, 'Show Built-In Extensions');
				
				showMessageChangedExtensions();
				
				if (show) vscode.commands.executeCommand('workbench.extensions.action.listBuiltInExtensions');
				
			});
		}
		
	}
	
	public static async detectUpdate (context:vscode.ExtensionContext) {
		
		const extensions = vscode.extensions.all.filter(({ packageJSON }) => packageJSON.publisher === 'vscode' && packageJSON._origin);
		
		const updates = await filter(extensions, async (extension) => {
			
			const srcFiles = await sourceFiles(extension.packageJSON._origin);
			const modifiedFiles = await sourceFiles(extension.extensionUri.fsPath);
			const keys = Object.keys(srcFiles);
			
			return !keys.every((relative) => !!modifiedFiles[relative]) || keys.some((relative) => {
				
				return !compare(srcFiles[relative].path, modifiedFiles[relative === 'package.json' ? 'package.backup' : relative]?.path);
				
			});
			
		});
		
		if (updates.length) {
			const autoUpdate = vscode.workspace.getConfiguration('l13BuiltInExtensions').get('autoUpdateModifiedBuiltInExtensions', true);
			const names = updates.map((extension) => extension.packageJSON.displayName.replace(' (modified)', ''));
			const ok = autoUpdate || await showMessageUpdate(`Extension${names.length > 1 ? 's' : ''} "${names.join('", "')}" ha${names.length > 1 ? 've' : 's'} changed. Do you want to update the modified extension${names.length > 1 ? 's' : ''}?`);
			if (ok) {
				updates.forEach(async (extension) => await ExtensionManager.update(context, extension));
				showMessageReload(`Please reload the window to activate the updated extension${names.length > 1 ? 's' : ''}.`);
			}
		}
		
	}
	
	public static async update (context:vscode.ExtensionContext, extension:vscode.Extension<any>) {
		
		const src = extension.packageJSON._origin;
		const originPackageJSON = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf-8'));
		const extensionPath = context.extensionPath;
		const availableFeatures:Feature[] = [];
		
		originPackageJSON.version = updateVersion(extension.packageJSON.version, originPackageJSON.version);
		
		features.forEach((feature) => {
			
			if (extension.packageJSON.contributes?.[feature.name]) availableFeatures.push(feature);
			
		});
		
		await copyExtension(extension, originPackageJSON, src, extensionPath, availableFeatures);
		
		updateObsolete(extension);
		
	}
	
	public static async clone (context:vscode.ExtensionContext) {
		
		const extensionPath = context.extensionPath;
		const extensions = vscode.extensions.all.filter(({ packageJSON }) => {
			
			if (packageJSON.publisher !== 'vscode') return false;
			if (packageJSON.name.endsWith('-modified')) return false;
			
			return features.some((feature) => packageJSON.contributes?.[feature.name]);
			
		});
		
		const items = extensions.map((extension:vscode.Extension<any>) => ({
			label: extension.packageJSON.displayName,
			description: extension.packageJSON.description,
			extension,
		}));
		
		if (!items.length) return showMessageBuiltIn('No built-in extensions available. Please enable the extension you want to modify.');
		
		const selectedExtension = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select an extension whose features you want to enable or disable.',
		});
		
		if (!selectedExtension) return;
		
		const src = selectedExtension.extension.extensionUri.fsPath;
		const originPackageJSON = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf-8'));
		const availableFeatures:Feature[] = [];
		
		features.forEach((feature) => {
			
			if (originPackageJSON.contributes?.[feature.name]) availableFeatures.push(feature);
			
		});
		
		const length = availableFeatures.length;
		const selectedFeatures = await vscode.window.showQuickPick(availableFeatures, {
			canPickMany: true,
			placeHolder: 'Please select the features you want to enable.',
		}) || [];
		
		if (!selectedFeatures.length) return;
		
		if (selectedFeatures.length === length) {
			return vscode.window.showInformationMessage(`Extension "${selectedExtension.extension.packageJSON.displayName}" will not be modified.`);
		}
		
		await copyExtension(selectedExtension.extension, originPackageJSON, src, extensionPath, selectedFeatures);
		
		showMessageChangedExtensions();
		
		showMessageBuiltIn(`Please disable the built-in extension "${selectedExtension.extension.packageJSON.displayName}".`);
		
	}
	
}

//	Functions __________________________________________________________________

async function showMessageBuiltIn (text:string) {
	
	const show = await vscode.window.showInformationMessage(text, 'Show Built-In Extensions');
	
	if (show) vscode.commands.executeCommand('workbench.extensions.action.listBuiltInExtensions');
	
}

async function showMessageReload (text:string) {
	
	const reload = await vscode.window.showInformationMessage(text, 'Reload Window');
	
	if (reload) vscode.commands.executeCommand('workbench.action.reloadWindow');
	
}

async function showMessageUpdate (text:string) {
	
	const config = vscode.workspace.getConfiguration('l13BuiltInExtensions');
	
	const ok = await vscode.window.showInformationMessage(text, 'Update', BUTTON_UPDATE_DONT_ASK_AGAIN);
	
	if (ok && ok === BUTTON_UPDATE_DONT_ASK_AGAIN) config.update('autoUpdateModifiedBuiltInExtensions', true, true);
	
	return !!ok;
}

async function showMessageChangedExtensions () {
	
	let disposables:vscode.Disposable[]|undefined = [];
		
	vscode.extensions.onDidChange(async () => {
		
		disposables?.forEach((disposable) => disposable.dispose());
		disposables = undefined;
		
		showMessageReload(`Please reload the window to enable the modified extension.`);
		
	}, null, disposables);
	
}

async function copy (src:string, dest: string) :Promise<undefined> {
	
	return new Promise((resolve, reject) => {
					
		copyFile(src, dest, (error:Error) => {
		
			if (error) reject(error);
			else resolve();
			
		});
		
	})
	
}

async function copyAll (dirname:string, dest:string) :Promise<any> {
	
	const files = await sourceFiles(dirname);
	const promises:Promise<any>[] = [];
	
	Object.keys(files).forEach((filename) => {
		
		const file = files[filename];
		
		if (file.type !== 'file') return;
		
		promises.push(copy(file.path, path.join(dest, file.relative)));
		
	});
	
	return Promise.all(promises);
	
}

function sourceFiles (dirname:string) :Promise<StatsMap> {
	
	return new Promise((resolve, reject) => {
		
		walkTree(dirname, (error, files) => {
		
			if (error) reject(error);
			else resolve(files);
			
		});
		
	});
	
}

function compare (fileA:string, fileB:string) {
	
	return fs.existsSync(fileA) && fs.existsSync(fileB) && fs.readFileSync(fileA).equals(fs.readFileSync(fileB));
	
}

function updateVersion (versionModified:string, versionOrigin:string) {
	
	const numbersModified = versionModified.split('.');
	const numbersOrigin = versionOrigin.split('.');
	
	if (numbersOrigin[0] > numbersModified[0]) return versionOrigin;
	if (numbersOrigin[1] > numbersModified[1]) return versionOrigin;
	if (numbersOrigin[2] > numbersModified[2]) return versionOrigin;
	
	numbersModified[2] = '' + (parseInt(numbersModified[2], 10) + 1);
	
	return numbersModified.join('.');
	
}

function updateObsolete (extension:vscode.Extension<any>) {
	
	const obsoletePath = path.join(path.dirname(extension.extensionUri.fsPath), '.obsolete');
	let obsoleteJSON:{ [name:string]:boolean } = {};
	
	if (fs.existsSync(obsoletePath)) obsoleteJSON = JSON.parse(fs.readFileSync(obsoletePath, 'utf-8'));
	
	obsoleteJSON[path.basename(extension.extensionUri.fsPath)] = true;
	
	fs.writeFileSync(obsoletePath, JSON.stringify(obsoleteJSON));
	
}

async function copyExtension (extension:vscode.Extension<any>, originPackageJSON:any, src:string, extensionPath:string, selectedFeatures:Feature[]) {
	
	originPackageJSON.name += '-modified';
	originPackageJSON.displayName = `${extension.packageJSON.displayName.replace(' (modified)', '')} (modified)`; // Fix for update
	originPackageJSON.icon = 'images/built-in.png';
	originPackageJSON._origin = src;
	
	const dest = path.join(path.dirname(extensionPath), `vscode.${originPackageJSON.name}-${originPackageJSON.version}`);
	
	if (fs.existsSync(dest)) return;
	
	features.forEach((feature) => {
		
		if (!selectedFeatures.includes(feature) && originPackageJSON.contributes?.[feature.name]) {
			originPackageJSON.contributes[feature.name] = undefined;
		}
		
	});
	
	await copyAll(src, dest);
	await copy(path.join(src, 'package.json'), path.join(dest, 'package.backup'));
	await copy(path.join(extensionPath, 'images', 'built-in.png'), path.join(dest, 'images', 'built-in.png'));
	
	fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(originPackageJSON, null, '\t'));
	
}

async function filter (array:any[], predicate:(...args:any) => Promise<boolean>) {
	
	const results = await Promise.all(array.map(predicate));

	return array.filter((value, index) => results[index]);
	
}