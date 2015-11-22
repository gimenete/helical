#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var nunjucks = require('nunjucks')
var _ = require('underscore')
var ncp = require('ncp')
var fse = require('fs-extra')
var util = require('util')
var watch = require('watch')

function Helical() {
}

function error() {
  return new Error(util.format.apply(null, arguments))
}

Helical.prototype.setModel = function(model) {
  if (!fs.existsSync(model)) {
    throw error('File not found %s', model)
  }

  if (fs.lstatSync(model).isDirectory()) {
    throw error('Data model file is a directory: %s', model)
  }

  try {
    this.model = JSON.parse(fs.readFileSync(model))
  } catch (err) {
    throw error('Error while parsing data model file: %s\n%s', model, err.stack || String(err))
  }

  this.modelFile = model
}

Helical.prototype.setGenerator = function(generator) {
  if (!fs.existsSync(argv.generator)) {
    throw error('Directory not found %s', argv.generator)
  }

  var manifest = path.join(argv.generator, 'helical.json')
  if (!fs.existsSync(manifest)) {
    throw error('File not found %s', manifest)
  }

  if (!fs.lstatSync(argv.generator).isDirectory()) {
    throw error('Generator option should be a directory: %s', argv.generator)
  }

  try {
    this.manifest = JSON.parse(fs.readFileSync(manifest))
  } catch (err) {
    throw error('Error while parsing manifest file: %s\n%s', manifest, err.stack || String(err))
  }

  this.manifestFile = manifest
  this.generator = generator
}

Helical.prototype.setOutput = function(output) {
  this.output = output;
}

Helical.prototype.setForce = function(force) {
  this.force = force;
}

Helical.prototype.startWatching = function() {
  var self = this

  watch.watchTree(this.generator, function(f, curr, prev) {
    if (typeof f === 'object' && prev === null && curr === null) {
      return
    }
    console.log('Detected file change on generator directory (%s)', f)
    self.run(false, f)
  })

  fs.watch(this.modelFile, function() {
    console.log('Detected file change on model file')
    var model = self.modelFile
    try {
      self.model = JSON.parse(fs.readFileSync(model))
    } catch (err) {
      console.error('Error while parsing data model file: %s\n%s', model, err.stack || String(err))
    }

    self.run(false)
  })

  fs.watch(this.manifestFile, function() {
    console.log('Detected file change on manifest file')
    self.run(false)
  })
}

Helical.prototype.setOptions = function(options) {
  this.options = options;
}

Helical.prototype.copyStaticFiles = function(base) {
  var outputdir = this.output

  ncp(base, outputdir, function (err) {
    if (err) {
      err.forEach(function(err) {
        if (err.code !== 'ENOENT') {
          console.error(err)
        }
      })
    }
  })
}

Helical.prototype.printNextSteps = function() {
  var basedir = this.generator
  var root = this.model
  var options = this.options

  var nextSteps = path.join(basedir, 'next-steps.txt')
  if (fs.existsSync(nextSteps)) {
    try {
      var source = fs.readFileSync(nextSteps, 'utf8')
      var output = nunjucks.renderString(source, {
        root: root,
        options: options,
      })
      require('chalkline').white()
      console.log(output)
    } catch (err) {
      console.error('Error while printing next steps', err.message)
    }
  }
}

Helical.prototype.run = function(printNextSteps, changedFile) {
  var generators = this.manifest.generators
  var root = this.model
  var basedir = this.generator
  var outputdir = this.output
  var force = this.force

  generators.forEach(function(generator) {
    if (changedFile && generator.source !== changedFile) {
      return
    }
    var source = fs.readFileSync(path.join(basedir, generator.source), 'utf8')
    var components = generator.foreach.split('.')
    function next(parent, components, i, ancestors) {
      var component = components[i]
      if (!component) {
        var options = {
          root: root,
          object: parent,
          ancestors: ancestors,
          options: optionValues,
        }
        try {
          var filename = nunjucks.renderString(generator.path, options)
        } catch (err) {
          console.error('Error while executing template %s %s', generator.path, err.message)
          return
        }
        if (!filename) return // ability to ignore some objects
        filename = path.join(outputdir, filename)
        if (!fs.existsSync(filename) || force) {
          var dirname = path.dirname(filename)
          mkdirp.sync(dirname)
          try {
            var output = nunjucks.renderString(source, options)
            fs.writeFileSync(filename, output)
            console.log('Wrote', filename)
          } catch (err) {
            console.error('Error while executing template %s %s', generator.source, err.message)
          }
        } else {
          console.log('Skipping', filename)
        }
      } else {
        var anc = [parent].concat(ancestors)
        var arr = parent && parent[component]
        if (!Array.isArray(arr)) arr = [arr]
        arr.forEach(function(item) {
          next(item, components, i+1, anc)
        })
      }
    }
    next(root, components, 0, [])
  })

  if (!changedFile) {
    this.copyStaticFiles(path.join(basedir, 'static'))
  } else if (changedFile.indexOf('static/') === 0) {
    var outputFile = changedFile.substring('static/'.length)
    fse.copy(changedFile, path.join(this.output, outputFile), function(err) {
      if (err) {
        console.error('Error copying file', err.message)
      }
    })
  }

  if (printNextSteps) {
    this.printNextSteps()
  }
}

if (module.id === require.main.id) {
  var yargs = require('yargs')
    .usage('Usage: $0 --model model.json --generator /path/to/some-generator')
    .options({
      'model': {
        alias: 'm',
        demand: true,
        describe: 'The data model file',
        type: 'string',
      },
      'generator': {
        alias: 'g',
        demand: true,
        describe: 'The directory that contains the helical generator',
        type: 'string',
      },
      'output': {
        alias: 'o',
        demand: true,
        describe: 'Output directory',
        type: 'string',
      },
      'force': {
        alias: 'f',
        describe: 'Override files existing files',
        type: 'boolean',
      },
      'watch': {
        alias: 'w',
        describe: 'Watch for changes in the data model file, manifest or templates, then re-run helical for the changed files',
        type: 'boolean',
      },
    })
    .wrap(require('yargs').terminalWidth())
    .help('h')
    .alias('h', 'help')

  var argv = yargs.argv

  var helical = new Helical()
  try {
    helical.setModel(argv.model)
    helical.setGenerator(argv.generator)
    helical.setOutput(argv.output)
    helical.setForce(argv.force)

    var options = {}
    helical.manifest.options.forEach(function(option) {
      var opt = _.pick(option, 'describe', 'type', 'choices', 'default')
      opt.demand = true
      options[option.name] = opt
    })
    yargs.options(options)
    var argv = yargs.argv
    var optionValues = {}
    helical.manifest.options.forEach(function(option) {
      optionValues[option.name] = argv[option.name]
    })

    helical.setOptions(optionValues)
    helical.run(true)

    if (argv.watch) {
      helical.startWatching()
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
