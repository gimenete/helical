var app = require('../')
{% if object.action != "create" %}{% set path = '/:id' %}{% endif %}
app.{{ object.method }}('/{{ ancestors[0].name | lower}}{{ path }}', function(req, res, next) {
  res.json({ 'Error': 'Not implemented' })
})
