var Sequelize = require('sequelize')

var options = {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
}

var url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/{{ root.projectName }}'
if (url.indexOf('localhost') === -1) {
  options.dialectOptions = { ssl: true }
}
var sequelize = new Sequelize(url, options)

var {{ object.name }} = exports.{{ object.name }} = sequelize.define('{{ object.name | lower }}', {
{% for field in object.fields %}  '{{ field.name }}': Sequelize.{{ field.type | upper }},
{% endfor %}
}, { underscored: true })
