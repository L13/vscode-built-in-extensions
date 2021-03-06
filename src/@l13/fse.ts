//	Imports ____________________________________________________________________

import * as fs from 'fs';
import * as path from 'path';

import { Callback, Options, WalkTreeJob } from '../types';

//	Variables __________________________________________________________________

// eslint-disable-next-line no-useless-escape
const findRegExpChars = /([\\\[\]\.\*\^\$\|\+\-\{\}\(\)\?\!\=\:\,])/g;
const sep = path.sep;

//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

export function copyFile (sourcePath:string, destPath:string, options?:any, callback?:any) {
	
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}
	
	destPath = path.resolve(sourcePath, destPath);
	
	const dirname = path.dirname(destPath);
	
	if (!fs.existsSync(dirname)) mkdirsSync(dirname);
	
	_copyFile(sourcePath, destPath, callback);
	
}

export function walkTree (cwd:string, options:Callback|Options, callback?:Callback) {
	
	callback = typeof options === 'function' ? options : callback;
	
	const findIgnore = Array.isArray((<Options>options).ignore) ? createFindGlob((<string[]>(<Options>options).ignore)) : null;
	
	const job:WalkTreeJob = {
		error: null,
		ignore: findIgnore,
		result: {},
		tasks: 1,
		done: (error?:Error) => {
			
			if (error) {
				job.error = error;
				(<Callback>callback)(error);
			} else (<Callback>callback)(null, job.result);
			
		},
	};
	
	_walktree(job, cwd);
	
}

// export function lstatSync (pathname:string) {
	
// 	try {
// 		return fs.lstatSync(pathname);
// 	} catch (error) {
// 		return null;
// 	}
	
// }

export function lstat (pathname:string) :Promise<fs.Stats> {
	
	return new Promise((resolve, reject) => {
		
		fs.lstat(pathname, (error, stat) => {
			
			if (error) reject(error);
			else resolve(stat);
			
		});
		
	});
	
}

export function createFindGlob (ignore:string[]) {
	
	return new RegExp(`^(${ignore.map((value) => escapeForRegExp(value)).join('|')})$`);
	
}

//	Functions __________________________________________________________________

function escapeForRegExp (text:any) :string {
	
	return ('' + text).replace(findRegExpChars, (match) => {
		
		if (match === '*') return '.+';
		if (match === '?') return '?';
		
		return '\\' + match;
		
	});
	
}

function _copyFile (sourcePath:string, destPath:string, options?:any, callback?:any) {
	
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}
	
	const source = fs.createReadStream(sourcePath);
	const dest = fs.createWriteStream(destPath);
	
	source.pipe(dest);
	
	source.on('error', (streamError:Error) => callback(streamError));
	source.on('end', () => callback());
	
}

function _walktree (job:WalkTreeJob, cwd:string, relative:string = '') {
	
	if (job.error) return; // If error no further actions
	
	const dirname = path.join(cwd, relative);
	
	fs.readdir(dirname, (dirError, names) => {
		
		if (job.error) return; // If error no further actions
		if (dirError) return job.done(dirError);
		
		job.tasks--; // directory read
		
		const ignore = job.ignore;
		
		if (ignore) names = names.filter((name) => !ignore.test(name));
		
		job.tasks += names.length;
		
		if (!job.tasks) return job.done();
		
		names.forEach((name) => {
			
			const pathname = path.join(dirname, name);
			
			if (job.result[pathname]) return job.tasks--;
			
			fs.lstat(pathname, (statError, stat) => {
				
				if (job.error) return; // If error no further actions
				if (statError) return job.done(statError);
				
				const currentRelative = path.join(relative, name);
				let currentDirname = path.dirname(currentRelative);
				
				currentDirname = currentDirname === '.' ? '' : currentDirname + sep;
				
				if (stat.isDirectory()) return _walktree(job, cwd, currentRelative);
				
				job.tasks--;
				
				if (stat.isFile()) {
					job.result[currentRelative] = {
						folder: cwd,
						relative: currentRelative,
						stat,
						
						path: pathname,
						name: currentRelative,
						basename: path.basename(currentRelative),
						dirname: currentDirname,
						extname: path.extname(currentRelative),
						type: 'file',
					};
				}
				
				if (!job.tasks) job.done();
				
			});
			
		});
		
	});
	
}

export function mkdirsSync (dirname:string) {
	
	const dirnames = dirname.split(sep);
	const base = dirnames.shift() || sep;
	
	return dirnames.reduce((parent, child) => {
		
		const current = path.join(parent, child);
		
		try {
			fs.mkdirSync(current);
		} catch (error) {
			if (error.code === 'EEXIST') return current;
			throw error.code === 'ENOENT' ? new Error(`Permission denied '${current}'`) : error;
		}
		
		return current;
		
	}, base);
	
}