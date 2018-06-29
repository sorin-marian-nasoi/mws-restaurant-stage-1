let gulp = require('gulp');
let cleanCSS = require('gulp-clean-css');

/*
gulp.task('one', function(done) {
  doAsyncStuff(function(err){
      done(err);
  });
});*/


gulp.task('copy-css', function(done) {
  gulp
    .src('./css/*.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('./dist/css'));

  done();
});

gulp.task('copy-images', function(done) {
  gulp
    .src('./images/*.jpg')
    .pipe(gulp.dest('./dist/images'));

  done();
});

gulp.task('copy-html', function(done) {
  gulp
    .src('./*.html')
    .pipe(gulp.dest('./dist'));

  done();
});

gulp.task('default', gulp.series('copy-css', 'copy-images', 'copy-html'));