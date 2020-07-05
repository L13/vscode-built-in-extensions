/* eslint-disable */
//	Imports ____________________________________________________________________

const child_process = require('child_process');
const del = require('del');
const fs = require('fs');
const glob = require('glob');
const gulp = require('gulp');
const rollup = require('rollup');
const typescript = require('rollup-plugin-typescript');

//	Variables __________________________________________________________________



//	Initialize _________________________________________________________________



//	Exports ____________________________________________________________________

gulp.task('clean', () => {
	
	return del(['out', 'test']);
	
});

gulp.task('script:services', () => {
	
	return rollup.rollup({
		input: 'src/extension.ts',
		external: [
			'fs',
			'path',
			'vscode',
		],
		plugins: [
			typescript({
				target: 'es6',
				lib: [
					'es6',
					'dom',
				],
				strict: true,
				removeComments: true,
			}),
		]
	}).then(bundle => {
		
		return bundle.write({
			file: 'out/extension.js',
			format: 'cjs',
			name: 'l13builtinservices',
			globals: {
				fs: 'fs',
				path: 'path',
				vscode: 'vscode',
			},
		});
		
	});
	
});

gulp.task('script:tests', () => {
	
	const promises = [];
	
	[{ in: 'src/test/index.ts', out: 'test/index.js'}]
	.concat(createInOut('src/**/*.test.ts'))
	.forEach((file) => {
		
		promises.push(rollup.rollup({
			input: file.in,
			external: [
				'assert',
				'glob',
				'fs',
				'mocha',
				'path',
			],
			plugins: [
				typescript({
					target: 'es6',
					lib: [
						'es6',
					],
					strict: true,
					removeComments: true,
				}),
			]
		}).then(bundle => {
			
			return bundle.write({
				file: file.out,
				format: 'cjs',
				name: 'l13builtintests',
				globals: {
					assert: 'assert',
					glob: 'glob',
					fs: 'fs',
					mocha: 'mocha',
					path: 'path',
				},
			});
			
		}));
		
	});
	
	return Promise.all(promises);
	
});

gulp.task('test', (done) => {
	
	const tests = child_process.spawn('npm', ['test']).on('close', () => done());
	
	let logger = (buffer) => buffer.toString().split(/\n/).forEach((message) => message && console.log(message));
	
	tests.stdout.on('data', logger);
	tests.stderr.on('data', logger);
	
});

gulp.task('script', gulp.series('script:services', 'script:tests'));

gulp.task('build', gulp.series('clean', 'script'/*, 'test'*/));

gulp.task('watch', () => {
	
	gulp.watch([
		'src/extension.ts',
		'src/types.ts',
		'src/services/**/!(*.test).ts',
		'src/commands/**/!(*.test).ts',
	], gulp.parallel('script:services'));
	
	gulp.watch([
		'src/test/index.ts',
		'src/**/*.test.ts',
	], gulp.series('script:tests', 'test'));
	
});

//	Functions __________________________________________________________________

function createInOut (pattern) {
	
	return glob.sync(pattern).map((filename) => {
		
		return {
			in: filename,
			out: filename.replace(/^src/, 'test').replace(/\.ts$/, '.js'),
		};
		
	});
	
}