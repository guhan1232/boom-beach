/// <reference path="typings/index.d.ts" />

const gulp = require('gulp');
const ts = require('gulp-typescript');
const tslint = require('gulp-tslint');
const clean = require('gulp-clean');
const nodemon = require('gulp-nodemon');
const jasmine = require('gulp-jasmine');
const gnf = require('gulp-npm-files');
const tar = require('gulp-tar');
const gzip = require('gulp-gzip');
const GulpSSH = require('gulp-ssh')
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');
const runSequence = require('run-sequence');

const config = require('./gulp.config.js')();
const tsProject = ts.createProject('tsconfig.json');

const gulpSSH = new GulpSSH({
	ignoreErrors: false,
	sshConfig: config.deploy.ssh
})

gulp.task('ts', () => {
	var tsResult = tsProject.src(config.ts.allTs)
		.pipe(sourcemaps.init())
		.pipe(tsProject());

	return tsResult.js
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(config.build.output));
});

gulp.task('ts-lint', () => {
	return gulp.src(config.ts.allTs)
		.pipe(tslint({ formatter: "prose" }))
		.pipe(tslint.report());
});

gulp.task('clean', function (cb) {
	return gulp.src(config.build.output, { read: false })
		.pipe(clean());
});

gulp.task('tests', ['ts'], () => {
	return gulp.src(config.js.tests)
			.pipe(jasmine());
});

gulp.task('tests-watch', ['ts'], () => {
	return gulp.watch(config.ts.allTs, ['ts', 'tests']);
});

gulp.task('watch', () => {
	gulp.watch(config.ts.allTs, ['ts']);
});

gulp.task('develop', ['ts', 'watch'], () => {
	var spawn = require("child_process").spawn, bunyan;

	nodemon({
		script: config.build.main,
		ignore: "operations.json",
		nodeArgs: ['--debug'],
		env: {
			NODE_ENV: "development"
		},
		stdout: false,
		readable: false
	}).on('readable', () => {
		// free memory 
		bunyan && bunyan.kill()

		bunyan = spawn('node', [
			'./node_modules/bunyan/bin/bunyan',
			'--output', 'short',
			'--color'
		]);

		bunyan.stdout.pipe(process.stdout)
		bunyan.stderr.pipe(process.stderr)

		this.stdout.pipe(bunyan.stdin)
		this.stderr.pipe(bunyan.stdin)
	});
});

gulp.task('_deployFiles', [], () => {
	return gulp
		.src(config.build.allFiles)
		.pipe(gulpSSH.dest(config.deploy.destination));
});

gulp.task('_copyDeps', () => {
	return gulp.src(gnf(), { base: './' })
		.pipe(gulp.dest(config.build.output));
});

gulp.task('_copyFiles', () => {
	return gulp.src(config.copyFiles)
		.pipe(gulp.dest(config.build.output));
});

gulp.task('_replaceConfigPath', () => {
	return gulp.src(config.build.config)
		.pipe(replace('../config.json', './config.json'))
		.pipe(gulp.dest(config.build.output));
});

// TODO: 
// - convert new lines

gulp.task('_archive', () => {
	return gulp.src(config.build.allFiles)
		.pipe(tar(config.build.archiveName + ".tar"))
		.pipe(gzip())
		.pipe(gulp.dest(config.root));
});

gulp.task('build', function (cb) {
	runSequence('clean', 'ts-lint', 'ts', '_copyFiles', '_replaceConfigPath', '_copyDeps', '_archive', cb);
});

gulp.task('deploy', function (cb) {
	runSequence('clean', 'ts-lint', 'ts', '_copyFiles', '_replaceConfigPath', '_copyDeps', '_deployFiles', cb);
});

gulp.task('default', function (cb) {
	runSequence('ts-lint', 'ts', cb);
});