var app = require('../')
{% if object.action != "create" %}{% set path = '/:id' %}{% endif %}
app.{{ object.method }}('/{{ ancestors[0].name | lower}}{{ path }}', req, res, next) {

}
