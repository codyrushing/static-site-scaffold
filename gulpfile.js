var path = require("path");

var gulp = require("gulp"),
    gulpPlugins = require("gulp-load-plugins")(),
    runSequence = require("run-sequence"),
    assembler = require("./assemblefile");

var paths = require("./paths");

const jsPackageName = "app.js";

gulp.task("templates", function(done) {
  return assembler.build((err) => {
    if (err) throw err;
    done();
  });
});

// copy normalize.css into our "generated" folder
// and give it .scss extension so sass can @import it
gulp.task("normalizeCSS", function(){
  return gulp.src( path.join(paths.src.lib, "normalize.css/normalize.css") )
    .pipe(gulpPlugins.rename({
      extname: ".scss",
      prefix: "_"
    }))
    .pipe(gulp.dest( path.join(paths.src.styles, "generated")) );
});

gulp.task("css", (done) => {
  runSequence("normalizeCSS", "buildCSS", done);
});

gulp.task("buildCSS", () => {
  return gulp.src([
    path.join(paths.src.styles, "*.scss"),
    "!" + path.join(paths.src.styles, "_*.scss")
  ])
    .pipe(gulpPlugins.plumber())
    .pipe(gulpPlugins.sourcemaps.init())
    .pipe(gulpPlugins.sass({
      includePaths: [paths.lib]
    }))
    .pipe(gulpPlugins.autoprefixer({
      browsers: 'last 3 versions'
    }))
    .pipe(gulpPlugins.sourcemaps.write())
    .pipe(gulp.dest(paths.dist.css))
    // begin prod flow
    .pipe(gulpPlugins.filter("**/*.css"))
    .pipe(gulpPlugins.sourcemaps.init())
    .pipe(gulpPlugins.base64({
      // baseDir: paths.dist.css,
      debug: true,
      extensions: ["woff"],
      maxImageSize: 50*1024
    }))
    .pipe(gulpPlugins.rename({
      suffix: ".min"
    }))
    .pipe(gulpPlugins.sourcemaps.write())
    .pipe(gulpPlugins.cleanCss())
    .pipe(gulp.dest(paths.dist.css))
});

gulp.task("eslint", () => {
  return gulp.src( path.join(paths.src.app, "**/*.js") )
    .pipe(gulpPlugins.newer( path.join(paths.dist.js, jsPackageName) ))
  	.pipe(gulpPlugins.eslint())
  	.pipe(gulpPlugins.eslint.format())
  	.pipe(gulpPlugins.eslint.failOnError())
});

gulp.task("js", ["eslint"], () => {
  const browserify = require("browserify");
  const source = require("vinyl-source-stream");

  var b = browserify(
    path.join(paths.src.app, "main.js"), // entry point
    {
      debug: true // write sourcemaps
    }
  ).transform("babelify");

  return b.bundle()
    .pipe(source(jsPackageName))
    .pipe(gulp.dest(paths.dist.js))
    .pipe(gulpPlugins.notify(`${jsPackageName} built :)`))
    .pipe(gulpPlugins.streamify(gulpPlugins.uglify()))
    .pipe(gulpPlugins.rename({
      suffix: ".min"
    }))
    .pipe(gulp.dest(paths.dist.js));
})

gulp.task("dev", ["templates", "css", "js"]);
