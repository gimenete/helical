# helical

Helical is a general purpose code generator. It takes a data model definition and a set of templates (called generators) and generates an output.

# Data model definition

It is just a JSON file with no given structure. The structure depends on the templates used. This file can be stored at any location.

# Manifest and generators

You need a manifest file and a set of templates. You have to put all of them in the same directory. The templates can be in subdirectories, but
the manifest file must always be in the root of the directory and it must be called `helical.json`.

The templating language used in all the templates is [nunjucks](https://mozilla.github.io/nunjucks/)

The manifest file is a JSON file with two sections:

- `generators`
- `options`

Here there is an example:

```json
{
  "generators": [
    {
      "source": "generators/entity.js",
      "path": "models/{{ object.name | lower }}.js",
      "foreach": "entities"
    },
    {
      "source": "generators/endpoint.js",
      "path": "controllers/{{ ancestors[0].name | lower }}-{{ object.action | lower }}.js",
      "foreach": "entities.endpoints"
    },
    {
      "source": "generators/app.js",
      "path": "index.js",
      "foreach": ""
    }
  ],
  "options": [
    {
      "name": "css",
      "describe": "CSS preprocessor",
      "type": "string",
      "choices": ["less", "saas"]
    }
  ]
}
```

And this could be a data model suitable of being processed by these generators:

```json
{
  "projectName": "project_name",
  "entities": [
    {
      "name": "User",
      "fields": [
        {
          "name": "email",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        }
      ],
      "endpoints": [
        {
          "action": "show",
          "method": "get"
        },
        {
          "action": "create",
          "method": "post"
        },
        {
          "action": "edit",
          "method": "put"
        },
        {
          "action": "delete",
          "method": "delete"
        }
      ]
    }
  ]
}
```

## Generators

Every generator must have at least these attributes: `source`, `path` and `foreach`.

- `source`: this is the relative path to the template.
- `path`: this is an inline template to generate the output filename.
- `foreach`: tells helical which objects should be processed by this generator. Leave it empty if you only want to execute this template once
for the whole data model.

In the example above for the first generator helical will loop over all the `entities` in your data model.
And for each entity it will run the `entity.js` template. If the data model file contains an entity with `{ "name": "User" }`
then after processing that entity the output will be stored in a file called `models/user.js`.

Every template, including the inlined templates to generate the filename (`path` attribute), will receive these objects:

- `object`: the object being processed.
- `ancestors`: an array of ancestor objects.
- `root`: the root of the data model.
- `options`: see section `options` below.

In the example above the second generator will be processed for each endpoint of each entity. Every time the `endpoint.js` template
is processed it will receive these objects:

- `object`: the endpoint being processed.
- `ancestors`: in this example `ancestors[0]` will reference the parent entity of this endpoint.
- `root`: the root of the data model.

## Options

Optionally you can define an array of `options` in your `helical.json` file. These are values that the user can pass in the command line interface
to the generators. Each option has the following attributes:

- `name`. The name of the option. If you have an option called `css` in your templates you can use `options.css` to access the value
- `describe` (optional). A description of this option
- `type` (optional). The type of this option. Can be `string`, `array`, `boolean`, `count` or `string`. See the [yargs](https://www.npmjs.com/package/yargs) documentation about this.
- `choices` (optional). You can specify an array of allowed values for this option.
- `default` (optional). The default value for this option.

If you specify a not boolean option and there's not a default value and the user didn't specify the option in the command line then the application will exit with a message like this:

```
Usage: helical --model model.json --generator /path/to/some-generator

Options:
  --model, -m      The data model file                                                             [string] [required]
  --generator, -g  The directory that contains the helical generator                               [string] [required]
  --output, -o     Output directory                                                                [string] [required]
  --force, -f      Override files existing files                                                             [boolean]
  -h, --help       Show help                                                                                 [boolean]
  --css            CSS preprocessor                                      [string] [required] [choices: "less", "saas"]

Missing required argument: css
```

## Static files

You can create a `static` directory and everything on it will be copied to the output directory. This is a good place to put files that are not plain text such
as images, fonts, or simply plain text files that don't need to be processed.

## Next steps message

You can render a message after all the files are generated creating a template `next-steps.txt`. This template will have access to the `root` and `options` objects.

# Overriding files

By default `helical` will not override existing files. But you can use the `--force` option to change this behavior.

# Installation

```
npm install helical -g
```

# Example

In this repository there is an example in the `example` directory. You can run it with:

```
helical \
  --model example/model.json \
  --generator example \
  --output output \
  --css less
```

This is the output:

```
Wrote output/models/user.js
Wrote output/controllers/user-show.js
Wrote output/controllers/user-create.js
Wrote output/controllers/user-edit.js
Wrote output/controllers/user-delete.js
Wrote output/index.js
```

# Skipping objects

You can avoid some objects to be processed by returning an empty file name in the `path` attribute of a generator. Example:

```
{
  "source": "endpoint.js",
  "path": "{% if object.action != 'delete' %}controllers/{{ ancestors[0].name | lower }}-{{ object.action | lower }}.js{% endif %}",
  "foreach": "entities.endpoints"
}
```

In this case endpoints with `"action": "delete"` won't generate any output.
