const mysql = require('serverless-mysql')

function connect({host, database, user, password}) {
	return mysql({
		config: {
		  host,
		  database,
		  user,
		  password,
		}
	});
}

module.exports = connect