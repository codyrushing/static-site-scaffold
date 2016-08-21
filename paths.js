var path = require("path");

var webRoot = path.join(__dirname, "public"),
    srcBase = path.join(webRoot, "src"),
    distBase = path.join(webRoot, "dist");

module.exports = {
  srcBase: srcBase,
  distBase: distBase,
  src: {
    lib: path.join(__dirname, "node_modules"),
    styles: path.join(srcBase, "styles"),
    app: path.join(srcBase, "app"),
    templates: path.join(srcBase, "views"),
    content: path.join(srcBase, "content")
  },
  dist: {
    css: path.join(distBase, "css"),
    js: path.join(distBase, "js"),
    pages: webRoot
  }
};
