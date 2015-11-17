#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var nunjucks = require('nunjucks')
var _ = require('underscore')
var ncp = require('ncp')

function run(model, helical, basedir, outputdir, force, optionValues) {
  var generators = helical.generators

  generators.forEach(function(generator) {
    var source = fs.readFileSync(path.join(basedir, generator.source), 'utf8')
    var components = generator.foreach.split('.')
    var root = model
    function next(parent, components, i, ancestors) {
      var component = components[i]
      if (!component) {
        var options = {
          root: root,
          object: parent,
          ancestors: ancestors,
          options: optionValues,
        }
        var filename = nunjucks.renderString(generator.path, options)
        if (!filename) return // ability to ignore some objects
        filename = path.join(outputdir, filename)
        if (!fs.existsSync(filename) || force) {
          var dirname = path.dirname(filename)
          mkdirp.sync(dirname)
          var output = nunjucks.renderString(source, options)
          fs.writeFileSync(filename, output)
          console.log('Wrote', filename)
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

  ncp(path.join(basedir, 'static'), outputdir, function (err) {
    if (err) {
      err.forEach(function(err) {
        if (err.code !== 'ENOENT') {
          console.error(err)
        }
      })
    }

    var nextSteps = path.join(basedir, 'next-steps.txt')
    if (fs.existsSync(nextSteps)) {
      var source = fs.readFileSync(nextSteps, 'utf8')
      var output = nunjucks.renderString(source, {
        root: model,
        options: options,
      })
      require('chalkline').white()
      console.log(output)
    }
  })
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
    })
    .wrap(require('yargs').terminalWidth())
    .help('h')
    .alias('h', 'help')

  var argv = yargs.argv

  if (!fs.existsSync(argv.model)) {
    console.error('File not found %s', argv.model)
    process.exit(1)
  }

  if (fs.lstatSync(argv.model).isDirectory()) {
    console.error('Data model file is a directory: %s', argv.model)
    process.exit(1)
  }

  if (!fs.existsSync(argv.generator)) {
    console.error('Directory not found %s', argv.generator)
    process.exit(1)
  }

  var manifest = path.join(argv.generator, 'helical.json')
  if (!fs.existsSync(manifest)) {
    console.error('File not found %s', manifest)
    process.exit(1)
  }

  if (!fs.lstatSync(argv.generator).isDirectory()) {
    console.error('Generator option should be a directory: %s', argv.generator)
    process.exit(1)
  }

  try {
    var model = JSON.parse(fs.readFileSync(argv.model))
  } catch (err) {
    console.error('Error while parsing data model file: %s\n%s', argv.model, err.stack || String(err))
    process.exit(1)
  }

  try {
    var helical = JSON.parse(fs.readFileSync(manifest))
  } catch (err) {
    console.error('Error while parsing manifest file: %s\n%s', manifest, err.stack || String(err))
    process.exit(1)
  }

  var generator = argv.generator
  var output = argv.output
  var force = argv.force
  var options = {}
  helical.options.forEach(function(option) {
    var opt = _.pick(option, 'describe', 'type', 'choices', 'default')
    opt.demand = true
    options[option.name] = opt
  })
  yargs.options(options)
  var argv = yargs.argv
  var optionValues = {}
  helical.options.forEach(function(option) {
    optionValues[option.name] = argv[option.name]
  })

  run(model, helical, generator, output, force, optionValues)
}
