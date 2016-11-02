Serverless Optimizer Plugin
=============================
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

Bundle with Browserify, transpile with Babel to ES5 and minify with Uglify your Serverless functions.

This plugin is a child of the great [serverless-optimizer-plugin](https://github.com/serverless/serverless-optimizer-plugin). Kudos!

**Note:** Requires Serverless *v1.0.0* or higher.

## Setup

 Install via npm in the root of your Serverless service:
```
npm install serverless-plugin-optimize babel-preset-es2015 --save-dev
```

* Add the plugin to the `plugins` array in your Serverless `serverless.yml`, like this:

```yml
plugins:
  - serverless-plugin-optimize
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

* **minify** (default `true`) - When mininify is set to `false` your functions won't be minified.

```yml
custom:
  optimize:
  	minify: false
```

* **presets** (default `es2015`) - Array of Babel presets.

```yml
custom:
  optimize:
  	presets: ['es2016']
```

#### Function

* **optimize** (default `true`) - When optimize is set to `false` the specific function won't be optimized.

```yml
functions:
  hello:
    optimize: false
```

* **exclude** - Array of modules that will be excluded from the specific function.

```yml
functions:
  hello:
    optimize:
      exclude: ['ajv']
```

## Contribute

Help us making this plugin better and future proof.

   * Clone the code
   * Install the dependencies with `npm install`
   * Create a feature branch `git checkout -b new_feature`
   * Lint with standard `npm run lint`

## License

This software is released under the MIT license. See [the license file](LICENSE) for more details.
