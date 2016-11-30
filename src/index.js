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
 * @requires 'uglifyify'
 * */
const babelify = require('babelify')
const browserify = require('browserify')
const BbPromise = require('bluebird')
const fs = BbPromise.promisifyAll(require('fs-extra'))
const path = require('path')
const uglify = require('uglifyify')

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

    /** Optimize variables with default options */
    this.optimize = {
      functions: [],
      options: {
        debug: false,
        exclude: ['aws-sdk'],
        extensions: [],
        global: false,
        ignore: [],
        minify: true,
        plugins: [],
        prefix: '_optimize',
        presets: ['es2015']
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

      /** Extensions */
      if (Array.isArray(this.custom.optimize.extensions)) {
        this.optimize.options.extensions = this.custom.optimize.extensions
      }

      /** Global transforms */
      if (typeof this.custom.optimize.global === 'boolean') {
        this.optimize.options.global = this.custom.optimize.global
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
      'after:deploy:function:packageFunction': this.afterCreateDeploymentArtifacts.bind(this),
      'before:deploy:function:packageFunction': this.beforeCreateDeploymentArtifacts.bind(this),
      'after:deploy:createDeploymentArtifacts': this.afterCreateDeploymentArtifacts.bind(this),
      'before:deploy:createDeploymentArtifacts': this.beforeCreateDeploymentArtifacts.bind(this)
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
    const functionFile = this.getPath(functionObject.handler.substring(0, functionFileIndex) + '.js')
    const functionOptimize = this.optimize.options.prefix + '/' + functionObject.name
    const functionBundle = functionOptimize + '.js'

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
      handlerOptimize: functionOptimize + functionObject.handler.substring(functionFileIndex),
      package: {
        exclude: ['!!**', '!' + functionBundle]
      }
    }

    /** Function optimize options */
    let functionOptions = {
      exclude: this.optimize.options.exclude,
      extensions: this.optimize.options.extensions,
      global: this.optimize.options.global,
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

      /** Extensions */
      if (Array.isArray(functionObject.optimize.extensions)) {
        functionOptions.extensions = optimize.extensions = functionObject.optimize.extensions
      }

      /** Global transforms */
      if (typeof functionObject.optimize.global === 'boolean') {
        functionOptions.global = optimize.global = functionObject.optimize.global
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

    /** Browserify babelify transform */
    bundler.transform(babelify, {
      global: functionOptions.global,
      ignore: functionOptions.ignore,
      plugins: functionOptions.plugins,
      presets: functionOptions.presets
    })

    /** Browserify minify transform */
    if (functionOptions.minify) {
      bundler.transform(uglify, {
        global: functionOptions.global,
        ignore: functionOptions.ignore
      })
    }

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
