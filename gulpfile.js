var path = require("path");

var gulp = require("gulp"),
    lazypipe = require("lazypipe"),
    del = require("del"),
    gulpPlugins = require("gulp-load-plugins")(),
    runSequence = require("run-sequence"),
    assembler = require("./assemblefile");

var paths = require("./paths");

const constants = require("./constants");
const vendorCSSDirectory = path.join(paths.src.styles, "vendor");
const jsPackageName = "app.js";

var jsProdChannel = lazypipe()
  .pipe(gulpPlugins.streamify, gulpPlugins.uglify())
  .pipe(gulpPlugins.rename, {
    suffix: ".min"
  })
  .pipe(gulp.dest, paths.dist.js);

gulp.task("templates", function(done) {
  return assembler.build((err) => {
    if (err) throw err;
    done();
  });
});

// copy normalize.css into our "generated" folder
// and give it .scss extension so sass can @import it
gulp.task("sassifyVendorCSS", () => {
  var vendorCSS = [{
    dependency: "normalize.css",
    glob: "normalize.css"
  }];

  let index = 0;

  return gulp.src(
      vendorCSS.map((item) => path.join(paths.src.lib, item.dependency, item.glob) )
    )
    .pipe(gulpPlugins.rename(function(path){
      path.dirname = vendorCSS[index].dependency;
      path.extname = ".scss";
      if(path.basename[0] !== "_"){
        path.basename = `_${path.basename}`;
      }
      index++;
      return path;
    }))
    .pipe(gulp.dest(vendorCSSDirectory));
});

gulp.task("css", (done) => {
  runSequence("sassifyVendorCSS", "buildCSS", done);
});

gulp.task("buildCSS", () => {
  return gulp.src([
      path.join(paths.src.styles, "*.scss"),
      "!" + path.join(paths.src.styles, "_*.scss")
    ])
    .pipe(gulpPlugins.plumber({
      // custom error handler because for some reason in this stream, errors do not end the stream
      errorHandler: function(err) {
        gulpPlugins.plumber().errorHandler(err);
        this.emit("close");
        this.emit("end");
      }
    }))
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
    .pipe(gulpPlugins.notify(`<%= file.relative %> built successfully`))
    .pipe(gulp.dest(paths.dist.css));
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
    .pipe(gulpPlugins.if(!constants.IS_DEVELOPMENT, jsProdChannel()));
});

gulp.task("watch", (done) => {
  gulpPlugins.watch(path.join(paths.src.app, "**/*.js"), () => {
    runSequence("js");
  });
  gulpPlugins.watch(path.join(paths.src.styles, "**/*.scss"), () => {
    runSequence("buildCSS");
  });
  gulpPlugins.watch([
      path.join(paths.src.templates, "**/*.hbs"),
      path.join(paths.src.content, "**/*.md"),
      path.join(paths.src.templates, "helpers.js")
    ],
    () => {
      runSequence("templates");
  });
  done();
});

gulp.task("clean", function(){
  return del([
    paths.distBase,
    vendorCSSDirectory
  ]);
});

gulp.task("default", ["clean"], function(done){
  runSequence(["templates", "css", "js"], done);
});

gulp.task("dev", ["default"], function(done){
  return runSequence("watch", done);
});
