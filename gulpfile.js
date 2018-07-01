const gulp = require('gulp');
const clean = require('gulp-clean');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify-es').default;

/*
gulp.task('one', function(done) {
  doAsyncStuff(function(err){
      done(err);
  });
});*/

gulp.task('clean-dist', () => {
  return gulp.src('./dist', {read: false, allowEmpty: true})
    .pipe(clean());
});

gulp.task('minify-css', () => {
  return gulp.src('./css/*.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('./dist/css'));
});

gulp.task('uglify-js', () => {
  return gulp.src('./js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js/'));
});

gulp.task('copy-images', function(done) {
  gulp
    .src(['./images/*.jpg','./images/*.svg'])
    .pipe(gulp.dest('./dist/images'));

  done();
});

gulp.task('copy-html', function(done) {
  gulp
    .src(['./*.html', './sw.js','manifest.json'])
    .pipe(gulp.dest('./dist'));

  done();
});

gulp.task('default', gulp.series('clean-dist', 'minify-css', 'uglify-js', 'copy-images', 'copy-html'));