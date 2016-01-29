var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var assert = require('assert')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

var Helical = require('../')

function update(filename) {
  fs.writeFileSync(filename, fs.readFileSync(filename))
}

describe('Helical', function() {
  this.timeout(5000)

  var output = path.join(__dirname, '../output')

  before(function() {
    rimraf.sync(output)
    mkdirp.sync(output)
  })

  it('fails if model file does not exist', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setModel('__')
      },
      Error
    )
  })

  it('fails if model file is a directory', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setModel(__dirname)
      },
      Error
    )
  })

  it('fails if model file is not a JSON file', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setModel(__filename)
      },
      Error
    )
  })

  it('fails if generators directory does not exist', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setGenerator(path.join(__dirname, 'not_found'))
      },
      Error
    )
  })

  it('fails if generators directory is not a directory', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setGenerator(__filename)
      },
      Error
    )
  })

  it('fails if manifest file is not found', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setGenerator(path.join(__dirname, 'notfound'))
      },
      Error
    )
  })

  it('fails if manifest file is not a JSON file', () => {
    var helical = new Helical()
    assert.throws(
      function() {
        helical.setGenerator(path.join(__dirname, 'malformed'))
      },
      Error
    )
  })

  it('#run', function(done) {
    var helical = new Helical()
    var model = path.join(__dirname, '../example/model.json')
    helical.setModel(model)
    helical.setGenerator(path.join(__dirname, '../example'))
    helical.setOutput(output)
    helical.setForce(true)
    helical.setNotify(false)
    helical.run(true, null, function() {
      var index = path.join(output, 'index.js')
      assert.ok(fs.existsSync(index))
      assert.ok(fs.existsSync(path.join(output, 'models/user.js')))
      assert.ok(fs.existsSync(path.join(output, 'controllers/user-show.js')))
      assert.ok(fs.existsSync(path.join(output, 'controllers/user-create.js')))
      assert.ok(fs.existsSync(path.join(output, 'controllers/user-edit.js')))
      assert.ok(fs.existsSync(path.join(output, 'controllers/user-delete.js')))
      assert.ok(fs.existsSync(path.join(output, 'public/css/bootstrap.min.css')))
      assert.ok(fs.existsSync(path.join(output, 'public/js/bootstrap.min.js')))

      var date = fs.statSync(index).mtime
      setTimeout(function() {
        helical.run(false, 'generators/app.js', function() {
          assert.ok(fs.statSync(index).mtime > date)

          helical.startWatching()
          setTimeout(function() {
            update(model)
            update(path.join(__dirname, '../example/helical.json'))
            update(path.join(__dirname, '../example/generators/app.js'))
            // TODO: check changed files
            setTimeout(done, 500)
          }, 100)
        })
      }, 1000)
    })
  })

  it('#run as a cli program', function(done) {
    var cmd = 'node'
    var args = ('index.js --model example/model.json --generator example --css less --output '+output).split(' ')
    var stderr = ''
    var stdout = ''

    var oldDir = process.cwd()
    process.chdir(path.join(__dirname, '..'))
    var bin = spawn(cmd, args)
    process.chdir(oldDir)

    bin.stderr.on('data', function (buf) {
      stderr += buf.toString()
    })

    bin.stdout.on('data', function (buf) {
      stdout += buf.toString()
    })

    bin.on('exit', function (code) {
      assert.equal(code, 0)
      done()
    })
  })

})
