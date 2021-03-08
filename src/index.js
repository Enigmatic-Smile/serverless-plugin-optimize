'use strict'

/**
 * @module serverless-plugin-optimize
 *
 * @see {@link https://serverless.com/framework/docs/providers/aws/guide/plugins/}
 *
 * @requires 'babelify'
 * @requires 'browserify'
 * @requires 'bluebird'
 * @requires 'fs-extra'
 * @requires 'path'
 * @requires 'resolve-from'
 * */
const babelify = require('babelify')
const browserify = require('browserify')
const BbPromise = require('bluebird')
const fs = BbPromise.promisifyAll(require('fs-extra'))
const path = require('path')
const resolveFrom = require('resolve-from')

/**
 * @classdesc Bundle, transpile to ES5 and minify your Serverless functions
 * @class Optimize
 * */
class Optimize {
  /**
   * @description Serverless Optimize
   * @constructor
   *
   * @param {!Object} serverless - Serverless object
   * @param {!Object} options - Serverless options
   * */
  constructor (serverless, options) {
    /** Serverless variables */
    this.serverless = serverless
    this.options = options
    this.custom = this.serverless.service.custom

    this.provider = this.serverless.getProvider('aws')

    /** Runtime >=node4.3 */
    const validRunTime = (!this.serverless.service.provider.runtime ||
      this.serverless.service.provider.runtime === 'nodejs4.3' ||
      this.serverless.service.provider.runtime === 'nodejs6.10' ||
      this.serverless.service.provider.runtime === 'nodejs8.10' ||
      this.serverless.service.provider.runtime === 'nodejs10.x' ||
      this.serverless.service.provider.runtime === 'nodejs12.x' ||
      this.serverless.service.provider.runtime === 'nodejs14.x')

    /** AWS provider and valid runtime check */
    if (validRunTime) {
      let nodeVersion = 'current'

      if (this.serverless.service.provider.runtime) {
        nodeVersion = this.serverless.service.provider.runtime.split('nodejs')[1]
      }

      if (nodeVersion.endsWith('.x')) {
        nodeVersion = nodeVersion.replace(/\.x$/, '')
      }

      /** Optimize variables with default options */
      this.optimize = {
        functions: [],
        options: {
          debug: false,
          exclude: ['aws-sdk'],
          external: [],
          externalPaths: {},
          extensions: [],
          global: false,
          includePaths: [],
          ignore: [],
          minify: true,
          plugins: [],
          prefix: '_optimize',
          presets: [[require.resolve('@babel/preset-env'), {
            targets: {
              node: nodeVersion
            }
          }]]
        }
      }

      /** Set custom options */
      if (this.custom && this.custom.optimize) {
        /** Debug flag */
        if (this.custom.optimize.debug === true) {
          this.optimize.options.debug = this.custom.optimize.debug
        }

        /** Exclude */
        if (Array.isArray(this.custom.optimize.exclude)) {
          this.optimize.options.exclude = this.custom.optimize.exclude
        }

        /** External */
        if (Array.isArray(this.custom.optimize.external)) {
          this.optimize.options.external = this.custom.optimize.external
        }

        /** External Paths */
        if (typeof this.custom.optimize.externalPaths === 'object') {
          this.optimize.options.externalPaths = this.custom.optimize.externalPaths
        }

        /** Extensions */
        if (Array.isArray(this.custom.optimize.extensions)) {
          this.optimize.options.extensions = this.custom.optimize.extensions
        }

        /** Global transforms */
        if (typeof this.custom.optimize.global === 'boolean') {
          this.optimize.options.global = this.custom.optimize.global
        }

        /** Include paths */
        if (Array.isArray(this.custom.optimize.includePaths)) {
          this.optimize.options.includePaths = this.custom.optimize.includePaths
        }

        /** Ignore */
        if (Array.isArray(this.custom.optimize.ignore)) {
          this.optimize.options.ignore = this.custom.optimize.ignore
        }

        /** Minify flag */
        if (typeof this.custom.optimize.minify === 'boolean') {
          this.optimize.options.minify = this.custom.optimize.minify
        }

        /** Babel plugins */
        if (Array.isArray(this.custom.optimize.plugins)) {
          this.optimize.options.plugins = this.custom.optimize.plugins
        }

        /** Optimize prefix */
        if (typeof this.custom.optimize.prefix === 'string') {
          this.optimize.options.prefix = this.custom.optimize.prefix
        }

        /** Babel presets */
        if (Array.isArray(this.custom.optimize.presets)) {
          this.optimize.options.presets = this.custom.optimize.presets
        }
      }

      /** Serverless hooks */
      this.hooks = {
        'after:package:function:package': this.afterCreateDeploymentArtifacts.bind(this),
        'before:package:function:package': this.beforeCreateDeploymentArtifacts.bind(this),
        'after:package:createDeploymentArtifacts': this.afterCreateDeploymentArtifacts.bind(this),
        'before:package:createDeploymentArtifacts': this.beforeCreateDeploymentArtifacts.bind(this),
        'after:invoke:local:invoke': this.afterCreateDeploymentArtifacts.bind(this),
        'before:invoke:local:invoke': this.beforeCreateDeploymentArtifacts.bind(this)
      }
    }
  }

  /**
   * @description Before create deployment artifacts
   *
   * @fulfil {} — Functions optimized
   * @reject {Error} Optimization error
   *
   * @return {Promise}
   * */
  beforeCreateDeploymentArtifacts () {
    /** Log optimize start */
    this.serverless.cli.log('Optimize: starting engines')

    /** Get prefix path */
    this.path = this.getPath(this.optimize.options.prefix)

    /** Package globally or individually */
    this.optimize.options.individually = !!(this.serverless.service.package && this.serverless.service.package.individually)
    if (!this.optimize.options.individually) {
      this.optimize.package = {
        exclude: ['**'],
        include: [this.optimize.options.prefix + '/**']
      }
      this.serverless.service.package = this.serverless.service.package || {}
      Object.assign(this.serverless.service.package, this.optimize.package)
    }

    /** Clean prefix folder */
    return this.cleanFolder().then(() => {
      /** Optimize one function */
      if (this.options.function) {
        return this.optimizeFunction(this.options.function)
      } else {
        /** Optimize all functions */
        return this.optimizeAllFunctions()
      }
    })
  }

  /**
   * @description After create deployment artifacts
   *
   * @fulfil {} — Optimization finished
   * @reject {Error} Optimization error
   *
   * @return {Promise}
   * */
  afterCreateDeploymentArtifacts () {
    /** Log optimize object if debug flag is set */
    if (this.optimize.options.debug) {
      this.serverless.cli.log('Optimize: debug ' + JSON.stringify(this.optimize, null, 2))
    } else {
      /** Clean prefix folder */
      return this.cleanFolder()
    }
  }

  /**
   * @description After create deployment artifacts
   *
   * @param {string} file — File path
   *
   * @return {String} Absolute file path
   * */
  getPath (file) {
    return path.join(this.serverless.config.servicePath, file)
  }

  /**
   * @description Create prefix folder
   *
   * @fulfil {} — Folder created
   * @reject {Error} File system error
   *
   * @return {Promise}
   * */
  createFolder () {
    return fs.mkdirsAsync(this.path)
  }

  /**
   * @description Clean prefix folder
   *
   * @fulfil {} — Folder cleaned
   * @reject {Error} File system error
   *
   * @return {Promise}
   * */
  cleanFolder () {
    return fs.removeAsync(this.path)
  }

  /**
   * @description Optimize all functions
   *
   * @fulfil {} — All functions optimized
   * @reject {Error} Optimization error
   *
   * @return {Promise}
   * */
  optimizeAllFunctions () {
    /** Get functions */
    const allFunctions = this.serverless.service.getAllFunctions()

    /** Create prefix folder */
    return this.createFolder().then(() => {
      /** Optimize each function */
      return BbPromise.map(allFunctions, (functionName) => {
        return this.optimizeFunction(functionName)
      })
    })
  }

  /**
   * @description Optimize function
   *
   * @param {string} functionName - Function name
   *
   * @fulfil {} — Function optimized
   * @reject {Error} Optimization error
   *
   * @return {Promise}
   * */
  optimizeFunction (functionName) {
    /** Function object variables */
    const functionObject = this.serverless.service.getFunction(functionName)
    functionObject.package = functionObject.package || {}
    const functionFileIndex = functionObject.handler.lastIndexOf('.')
    const functionPath = functionObject.handler.substring(0, functionFileIndex)
    const functionFile = this.getPath(functionPath + '.js')
    const functionOptimizePath = this.optimize.options.prefix + '/' + functionObject.name
    const functionOptimizeHandler = functionOptimizePath + '/' + functionPath
    const functionBundle = this.getPath(functionOptimizeHandler + '.js')
    const functionDir = functionPath.substring(0, functionPath.lastIndexOf('/'))
    const functionModulesOptimizeDir = functionOptimizePath + '/' + functionDir + '/' + 'node_modules'

    /** Skip function */
    if (functionObject.optimize === false) {
      return BbPromise.resolve('optimization skipped')
    }

    /** Log function to optimize */
    this.serverless.cli.log('Optimize: ' + functionObject.name)

    /** Optimize object */
    let optimize = {
      bundle: functionBundle,
      handlerOriginal: functionObject.handler,
      handlerOptimize: functionOptimizeHandler + functionObject.handler.substring(functionFileIndex),
      package: {
        exclude: ['**'],
        include: [functionOptimizePath + '/**']
      }
    }

    /** Function optimize options */
    let functionOptions = {
      exclude: this.optimize.options.exclude,
      external: this.optimize.options.external,
      externalPaths: Object.assign({}, this.optimize.options.externalPaths),
      extensions: this.optimize.options.extensions,
      global: this.optimize.options.global,
      includePaths: this.optimize.options.includePaths,
      ignore: this.optimize.options.ignore,
      minify: this.optimize.options.minify,
      plugins: this.optimize.options.plugins,
      presets: this.optimize.options.presets
    }

    if (functionObject.optimize) {
      /** Exclude */
      if (Array.isArray(functionObject.optimize.exclude)) {
        functionOptions.exclude = optimize.exclude = functionObject.optimize.exclude
      }

      /** External */
      if (Array.isArray(functionObject.optimize.external)) {
        functionOptions.external = optimize.external = functionObject.optimize.external
      }

      /** External paths */
      if (typeof functionObject.optimize.externalPaths === 'object') {
        functionOptions.externalPaths = optimize.externalPaths = functionObject.optimize.externalPaths
      }

      /** Extensions */
      if (Array.isArray(functionObject.optimize.extensions)) {
        functionOptions.extensions = optimize.extensions = functionObject.optimize.extensions
      }

      /** Global transforms */
      if (typeof functionObject.optimize.global === 'boolean') {
        functionOptions.global = optimize.global = functionObject.optimize.global
      }

      /** Include paths */
      if (Array.isArray(functionObject.optimize.includePaths)) {
        functionOptions.includePaths = optimize.includePaths = functionObject.optimize.includePaths
      }

      /** Ignore */
      if (Array.isArray(functionObject.optimize.ignore)) {
        functionOptions.ignore = optimize.ignore = functionObject.optimize.ignore
      }

      /** Minify flag */
      if (typeof functionObject.optimize.minify === 'boolean') {
        functionOptions.minify = optimize.minify = functionObject.optimize.minify
      }

      /** Babel plugins */
      if (Array.isArray(functionObject.optimize.plugins)) {
        functionOptions.plugins = optimize.plugins = functionObject.optimize.plugins
      }

      /** Babel presets */
      if (Array.isArray(functionObject.optimize.presets)) {
        functionOptions.presets = optimize.presets = functionObject.optimize.presets
      }
    }

    /** Browserify */
    const bundler = browserify({
      entries: [functionFile],
      extensions: functionOptions.extensions,
      standalone: 'handler',
      browserField: false,
      builtins: false,
      commondir: false,
      ignoreMissing: true,
      detectGlobals: true,
      insertGlobalVars: { // https://github.com/substack/node-browserify/issues/1472
        process: undefined,
        global: undefined,
        'Buffer.isBuffer': undefined,
        Buffer: undefined
      }
    })

    /** Browserify exclude */
    functionOptions.exclude.forEach((exclusion) => {
      bundler.exclude(exclusion)
    })

    /** Browserify external */
    functionOptions.external.forEach((external) => {
      bundler.external(external)
    })

    /** Browserify Babili minification preset */
    if (functionOptions.minify) {
      functionOptions.presets = [[require.resolve('babel-preset-minify'), {
        builtIns: false,
        mangle: false
      }]].concat(functionOptions.presets)
    }

    /** Browserify babelify transform */
    bundler.transform(babelify, {
      comments: false,
      global: functionOptions.global,
      ignore: functionOptions.ignore,
      plugins: functionOptions.plugins,
      presets: functionOptions.presets
    })

    /** Generate bundle */
    return new Promise((resolve, reject) => {
      bundler.bundle((error, buff) => {
        /** Bundle error */
        if (error) {
          return reject(error)
        }

        /** Write bundle */
        resolve(fs.outputFileAsync(functionBundle, buff.toString()))
      })
    }).then(() => {
      /** Copy includePaths files to prefix folder */
      if (functionOptions.includePaths.length) {
        return BbPromise.map(functionOptions.includePaths, (includePath) => {
          /** Remove relative dot */
          if (includePath.substring(0, 2) === './') {
            includePath = includePath.substring(2)
          }

          /** Copy file */
          return fs.copyAsync(this.getPath(includePath), this.getPath(functionOptimizePath + '/' + includePath))
        })
      }
    }).then(() => {
      /** Copy external files to prefix folder */
      if (functionOptions.external.length) {
        return BbPromise.map(functionOptions.external, (external) => {
          /** Remove relative dot */
          if (external.substring(0, 2) === './') {
            external = external.substring(2)
          }

          /** Copy file */
          const externalEntry = resolveFrom(functionFile, external) || functionDir + '/'
          const externalDir = externalEntry.substring(
            this.serverless.config.servicePath.length,
            externalEntry.lastIndexOf('node_modules/' + external)
          ) + 'node_modules/' + external
          return fs.copyAsync(
            this.getPath(functionOptions.externalPaths[external] || externalDir),
            this.getPath(functionModulesOptimizeDir + '/' + external)
          )
        })
      }
    }).then(() => {
      /** Add optimized function to functions array */
      this.optimize.functions.push(optimize)

      /** Update function object with optimize bundle */
      functionObject.handler = optimize.handlerOptimize

      /** Update package */
      functionObject.package = optimize.package
    })
  }
}

/** Export optimize class */
module.exports = Optimize
