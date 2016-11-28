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

Configuration options can be set globally in `custom` property and inside function in `optimize` property.

#### Global

* **debug** (default `false`) - When debug is set to `true` it won't remove `prefix` folder and will generate debug output at the end of package creation.

```yml
custom:
  optimize:
    debug: true
```

* **exclude** (default `aws-sdk`) - Array of modules that will be globally excluded from all the bundles.

```yml
custom:
  optimize:
  	exclude: ['ajv']
```

* **minify** (default `true`) - When minify is set to `false` your functions won't be minified.

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

* **presets** (default `es2015`) - Array of Babel presets.

```yml
custom:
  optimize:
  	presets: ['es2016']
```

* **global** (default `true`) - When global is set to `false` babelify and uglify transforms won't be run globally.

```yml
custom:
  optimize:
    global: false
```

#### Function

* **optimize** (default `true`) - When optimize is set to `false` the function won't be optimized.

```yml
functions:
  hello:
    optimize: false
```

* **exclude** - Array of modules that will be excluded from the function.

```yml
functions:
  hello:
    optimize:
      exclude: ['ajv']
```

* **minify** - When minify is set to `false` the function won't be minified.

```yml
functions:
  hello:
    optimize:
      minify: false
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
```

## Troubleshooting

#### global - what it does?
`global` is set by default to `true` enabling Browserify transforms (Babel and UglifyJS) to be run inside `node_modules`.
Some node modules can break in this process and you may end up getting errors when running your optimized handler.
To fix this, set `global` to `false` globally or inside function.

## Contribute

Help us making this plugin better and future proof.

   * Clone the code
   * Install the dependencies with `npm install`
   * Create a feature branch `git checkout -b new_feature`
   * Lint with standard `npm run lint`

## License

This software is released under the MIT license. See [the license file](LICENSE) for more details.
