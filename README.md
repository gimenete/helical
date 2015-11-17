# helical

Helical is a general purpose code generator. It takes a data model definition and a set of templates (called generators) and generates an output.

# Data model definition

It is just a JSON file with no given structure. The structure depends on the templates used. This file can be stored at any location.

# Generators

You need a manifest file and a set of templates. You have to put all of them in the same directory. The templates can be in subdirectories, but
the manifest file must always be in the root of the directory and it must be called `helical.json`.

The templating language used in all the templates is [nunjucks](https://mozilla.github.io/nunjucks/)

The manifest file is a JSON file with two sections:

- Generators
- Options (future use)

Here there is an example:

```json
{
  "generators": [
    {
      "source": "entity.js",
      "path": "models/{{ object.name | lower }}.js",
      "foreach": "entities"
    },
    {
      "source": "endpoint.js",
      "path": "controllers/{{ ancestors[0].name | lower }}-{{ object.action | lower }}.js",
      "foreach": "entities.endpoints"
    },
    {
      "source": "app.js",
      "path": "index.js",
      "foreach": ""
    }
  ],
  "options": [

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

In the example above the second generator will be processed for each endpoint of each entity. Every time the `endpoint.js` template
is processed it will receive these objects:

- `object`: the endpoint being processed.
- `ancestors`: in this example `ancestors[0]` will reference the parent entity of this endpoint.
- `root`: the root of the data model.


# Installation

```
npm install helical -g
```

# Example

In this repository there is an example in the `example` directory. You can run it with:

```
helical --model example/model.json  --generator example/ -o output/
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

In this case endpoints with `{ "action": "delete" }` won't generate any output.
