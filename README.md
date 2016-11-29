Serverless Optimize Plugin
=============================
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com) 
[![npm version](https://badge.fury.io/js/serverless-plugin-optimize.svg)](https://badge.fury.io/js/serverless-plugin-optimize)
[![dependencies](https://img.shields.io/david/FidelLimited/serverless-plugin-optimize.svg)](https://www.npmjs.com/package/serverless-plugin-optimize)
[![license](https://img.shields.io/npm/l/serverless-plugin-optimize.svg)](https://raw.githubusercontent.com/FidelLimited/serverless-plugin-optimize/master/LICENSE)

Bundle with Browserify, transpile with Babel to ES5 and minify with Uglify your Serverless functions.

This plugin is a child of the great [serverless-optimizer-plugin](https://github.com/serverless/serverless-optimizer-plugin). Kudos!

**Note:** Requires Serverless *v1.2.x* or higher.

## Setup

 Install via npm in the root of your Serverless service:
```
npm install serverless-plugin-optimize babel-preset-es2015 --save-dev
```

* Add the plugin to the `plugins` array in your Serverless `serverless.yml`:

```yml
plugins:
  - serverless-plugin-optimize
```

* Set your packages to be built individually to have smaller packages:

```yml
package:
  individually: true
```

* All done!

## Options

Configuration options can be set globally in `custom` property and inside each function in `optimize` property. Function options overwrite global options.

#### Global

* **debug** (default `false`) - When debug is set to `true` it won't remove `prefix` folder and will generate debug output at the end of package creation.

```yml
custom:
  optimize:
    debug: true
```

* **exclude** (default `['aws-sdk']`) - Array of modules or paths that will be excluded.

```yml
custom:
  optimize:
  	exclude: ['ajv']
```

* **extensions** (default `['.js', '.json']`) - Array of optional extra extensions modules that will be included.

```yml
custom:
  optimize:
  	extensions: ['.extension']
```

* **global** (default `true`) - When global is set to `false` transforms won't be run inside `node_modules`.

```yml
custom:
  optimize:
    global: false`
```

* **presets** (default `es2015`) - Array of Babel presets.

```yml
custom:
  optimize:
  	presets: ['es2016']

* **minify** (default `true`) - When minify is set to `false` Uglify transform won't run.

```yml
custom:
  optimize:
  	minify: false
```

* **prefix** (default `_optimize`) - Folder to output bundle.

```yml
custom:
  optimize:
  	prefix: 'dist'
```
```

#### Function

* **optimize** (default `true`) - When optimize is set to `false` the function won't be optimized.

```yml
functions:
  hello:
    optimize: false
```

* **exclude** - Array of modules or paths that will be excluded.

```yml
functions:
  hello:
    optimize:
      exclude: ['ajv']
```

* **extensions** - Array of optional extra extensions modules that will be included.

```yml
functions:
  hello:
    optimize:
      extensions: ['.extension']
```

* **presets** - Array of Babel presets for the function.

```yml
functions:
  hello:
    optimize:
      presets: ['es2016']
```

* **global** - When global is set to `false` babelify and uglify transforms won't be run globally.

```yml
functions:
  hello:
    optimize:
      global: false

* **minify** - When minify is set to `false` Uglify transform won't run.

```yml
functions:
  hello:
    optimize:
      minify: false
```



## Contribute

Help us making this plugin better and future proof.

   * Clone the code
   * Install the dependencies with `npm install`
   * Create a feature branch `git checkout -b new_feature`
   * Lint with standard `npm run lint`

## License

This software is released under the MIT license. See [the license file](LICENSE) for more details.
