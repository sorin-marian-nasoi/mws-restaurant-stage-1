let gulp = require('gulp');
let cleanCSS = require('gulp-clean-css');

/*
gulp.task('one', function(done) {
  doAsyncStuff(function(err){
      done(err);
  });
});*/



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

gulp.task('default', gulp.series('copy-images', 'copy-html'));