var gulp = require('gulp')
var webserver = require('gulp-webserver')
var sass = require('gulp-sass')
var browserSync = require('browser-sync').create()
var reload = browserSync.reload
var pug = require('gulp-pug')

gulp.task('default', ['sass', 'views', 'browser-sync'], function() {
	gulp.watch('sass/*.sass', ['sass'], reload)
	gulp.watch('views/**/*.pug', ['views'], reload)
	gulp.watch('js/*.js', reload)
	gulp.watch('./*.js', reload)
})

// SASS Compiler
gulp.task('sass', function() {
	gulp.src('./sass/*.sass')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./css/'))
		.pipe(reload({
			stream: true
		}))
})

// PUG Compiler
gulp.task('views', function buildHTML() {
	return gulp.src('views/*.pug')
		.pipe(pug({}))
		.pipe(gulp.dest('./'))
		.pipe(reload({
			stream: true
		}))
})

// BrowserSync
gulp.task('browser-sync', ['webserver'], function() {
	browserSync.init(null, {
		proxy: 'http://localhost:8000',
		port: 3000,
		reloadDelay: 100
	})
})

// Webserver
gulp.task('webserver', function() {
	gulp.src('./')
		.pipe(webserver({
			fallback: 'index.html',
			directoryListing: false,
			open: false
		}))
})
