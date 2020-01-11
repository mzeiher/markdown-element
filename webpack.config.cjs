const fs = require('fs');
const path = require('path');

const debug = process.argv.some((value) => value ==='--debug');

class RewriteJSToTSResolver {
    constructor(source, target) {
      this.source = source || 'resolve';
      this.target = target || 'resolve';
    }
  
    apply(resolver) {
      const target = resolver.ensureHook(this.target);
      resolver
        .getHook(this.source)
        .tapAsync("RewriteJSToTSResolver", (request, resolveContext, callback) => {
          if (request.request.substr(request.request.lastIndexOf('.')) === '.js' && fs.existsSync(path.resolve(request.path, request.request.substr(0, request.request.lastIndexOf('.')) + '.ts'))) {
            request.request = request.request.substr(0, request.request.lastIndexOf('.')) + '.ts';
            return resolver.doResolve(target, request, null, resolveContext, callback);
          } else {
            callback();
          }
        });
    }
  }

module.exports = {
    mode: debug ? 'development': 'production',
    devtool: debug ? 'inline-source-map' : 'none',
    entry: "./src/index.ts",
    output: {
        filename: "bundle.js"
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: [".ts", ".tsx", ".js"],
        plugins: [new RewriteJSToTSResolver()]
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.tsx?$/, loader: "ts-loader" }
        ]
    }
};